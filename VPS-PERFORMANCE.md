# The VPS is at 100% CPU — what to do

Written 2026-10-13, when `acsgroup.cloud` stopped answering on 80 and 443 and the
CPU graph was flat out.

## The short version

Both apps poll, hard, and the database had **no indexes at all**:

| Who | What it asks for | How often |
|---|---|---|
| Customer app, per signed-in phone | `GET /api/orders?customerId=…` | **every 2 s** (`useOrderStatusMonitor.ts:82`) |
| Customer app, per signed-in phone | `GET /api/mobile/notifications?audience=customers…` | every 2 s |
| Customer app, order tracking screen | `GET /api/orders/{id}` (was ~600 KB with the photos) | every 5 s |
| Captain app, per captain | `GET /api/orders?partnerScope=…` | every 10 s, **twice** (two copies of the monitor are mounted) |
| Admin customers page | one `Order.find()` **per customer** | every load |

Nothing in `admin panel/models/` declared an index, so every one of those was a
full scan of the whole `orders` collection followed by an in-memory sort. The
cost of a single poll therefore grows with every order ever placed, and it is
paid again for every user, every two seconds. That is the CPU.

## Fixed in the code (deploy to get it)

- **Indexes** on `orders` (`orderId`, `customerId+createdAt`, `partnerId+status`,
  `status+createdAt`, `createdAt`, `pickupAddress.pincode+status`),
  `wallettransactions`, `reviews`, `subscriptions`. Declared on the schemas, so a
  deploy creates them.
- **`.lean()`** on the orders list, which was hydrating full Mongoose documents
  for every order on every poll and throwing them away.
- **The admin customers page no longer runs one query per customer** — one
  grouped aggregate instead.
- **`GET /api/orders/{id}` leaves out the pickup photos** unless the caller asks
  with `?includePhotos=1`. They are base64 inside the document, about 600 KB an
  order, and only the admin order detail screen displays them. The customer app
  was downloading them every five seconds while someone watched their order.

## Do this on the server, in order

```bash
# 1. What is actually burning the CPU: node, mongod, or something else?
top -b -n 1 -o %CPU | head -15
pm2 status
pm2 describe admin-panel | grep -E "script|exec mode|instances|uptime|restarts"
```

`restarts` climbing on its own means it is crash-looping — read `pm2 logs
admin-panel --lines 100` before anything else. `script` should be `npm start`;
if it says `dev`, it is recompiling on every request, which alone will hold the
CPU down.

```bash
# 2. Which endpoint is the flood? (the answer is almost certainly /api/orders)
awk '{print $7}' /var/log/nginx/access.log | sed 's/?.*//' | sort | uniq -c | sort -rn | head -15
```

```bash
# 3. Add the indexes NOW — this does not need a deploy and is the big win.
cd "/var/www/laundry-admin/admin panel"
node scripts/create-indexes.js
```

It only adds indexes: it reads no documents, writes none, and is safe to run
twice. On a collection of a few thousand orders it finishes in seconds.

```bash
# 4. Then deploy the rest of the fix.
git pull && npm install && npm run build && pm2 restart admin-panel

# 5. Logs: PM2 keeps every line forever by default.
du -sh ~/.pm2/logs/*
pm2 flush                      # if they are large
pm2 install pm2-logrotate      # so it does not come back
```

## If the CPU is still high

- `mongotop 5` and `mongostat 5` show which collection the database is working
  on and how many queries a second it is answering.
- The Captain app mounting its order monitor **twice** is in the shipped build
  and cannot be fixed from the server — it doubles every captain's polling. The
  Flutter port already mounts it once.
- The two-second customer poll is also in the shipped build. If it has to come
  down before those builds are replaced, the server can answer a repeated
  identical poll from a short-lived cache rather than the database; say the word
  and it is a small change to `app/api/orders/route.ts`.

## Longer term

- Move the pickup photos out of the documents and onto disk (`/uploads`, which
  nginx already serves directly), keeping only the URL on the order. Every query
  that touches an order is paying for them today.
- Give `GET /api/orders` a default limit. It is unbounded, and the admin panel
  and old app builds both call it with no filter at all.
