# CLAUDE.md — Urban Steam project knowledge base

This file is loaded automatically by Claude Code in every session in this repo.
Read it fully before touching anything. It describes how the system really works today,
not how it should work.

---

## 0. RULES OF ENGAGEMENT (read first)

This is a **live production system** used by real customers, delivery partners and admins.
Three applications share **one backend and one MongoDB database**. A small change in one
place can silently break the other two.

1. **Analyse before you change.** Never edit a file because a single symptom looks obvious.
   Read the file, then find every other place that touches the same data.
2. **The backend is shared.** `admin panel/app/api/**` serves the admin web UI *and* both
   mobile apps. Before changing any API route, grep for its path in **all three** apps:
   ```bash
   grep -rn "api/orders" customer/src partner/src "admin panel/app"
   ```
3. **The mobile apps are compiled and shipped as APK/AAB/IPA.** Users are running OLD
   builds. Any backend change must stay backwards compatible with already-installed apps,
   or those users break instantly. Adding a field is safe; renaming or removing one is not.
4. **Never change the order `status` enum values** (`admin panel/models/Order.ts`). They are
   hardcoded as strings in dozens of screens across all three apps.
5. **Money code is fragile.** Wallet balance, `dueAmount`, cancellation fees, delivery
   failure fees, loyalty points and refunds are spread across several routes and screens.
   Read section 6 completely before touching any of it.
6. **This codebase has known bugs (section 9).** Some look like harmless mistakes but the
   business may already depend on the current behaviour. Confirm with the owner before
   "fixing" anything in section 9.
7. **Don't run destructive scripts.** `admin panel/scripts/*.js`, `check-orders.js`,
   `test-*.js` and the root `fix_*.py` / `replace_*.py` files write directly to the
   database or rewrite source files in place. The Python scripts are obsolete one-off
   repairs from Nov 2025 — do not run them.
8. **Never commit secrets.** Keystores and passwords are already in git history
   (section 8.5). Don't add more.
9. **Verify, don't trust this file blindly.** It was accurate when written. If something
   here contradicts the code, the code wins — and please update this file.

---

## 1. What this project is

**Urban Steam** — a laundry / steam-ironing service (ACS Group, built by TechnovaTech).
Customers book a pickup, a partner collects the clothes, a hub processes them, a partner
delivers them back.

| Part | Folder | Stack | Dev port |
|---|---|---|---|
| Admin panel **+ the whole backend API** | `admin panel/` (note the space) | Next.js 15, Mongoose, MongoDB | 3000 |
| Customer mobile app | `customer/` | React 18 + Vite + shadcn/ui + Capacitor 7 | 3001 |
| Partner ("Captain") mobile app | `partner/` | Next.js 15 static export + Capacitor 7 | 3002 |

- **Production API / admin:** `https://acsgroup.cloud` (VPS, nginx → PM2 → Next.js on :3000)
- **Database:** MongoDB, database name `laundry`
- **Repo:** `https://github.com/yash9424/laundry-main.git` (remote `origin`, default branch
  `master`). This is the active repo as of 2026-09-25. The older
  `TechnovaTech/Laundry-main` repo is no longer connected — don't push there.
- **App IDs:** customer `com.acsgroup.urbansteam.customer` (Android build.gradle still says
  `com.urbansteam.customerapp` — mismatch, see 9.4), partner `com.urbansteam.partner`

```
Customer app (Android/iOS) ─┐
Partner app  (Android/iOS) ─┼──► https://acsgroup.cloud/api/**  ──► MongoDB "laundry"
Admin panel  (browser)     ─┘        (admin panel/app/api)
```

There is **no separate backend service**. If the admin panel is down, both mobile apps are
dead.

---

## 2. Repo layout

```
admin panel/
  app/admin/**/page.tsx     21 admin screens (the UI)
  app/api/**/route.ts       66 API routes — THE BACKEND for all three apps
  app/components/           Sidebar, Header, Modal, ResponsiveLayout
  lib/                      mongodb.ts, indoriSms.ts, otpStore.ts, firebase.ts (unused)
  models/                   18 Mongoose models — the source of truth for data shapes
  middleware.ts             CORS only (no auth)
  ecosystem.config.js       PM2 config for production
customer/
  src/pages/                28 screens (routing in src/App.tsx)
  src/components/           app components; components/ui/* is stock shadcn (don't edit)
  src/services/             notificationService.ts (local notifications), googleAuth.ts (unused)
  src/hooks/                useOrderStatusMonitor (polling), use-safe-area, use-keyboard
  src/utils/                generateInvoice.ts, generateSubscriptionInvoice.ts, apiOptimizer.ts
  src/config/api.ts         API_URL
  capacitor.config.ts       native config
partner/
  src/app/**/page.tsx       27 screens (Next.js App Router, static export)
  src/components/           BottomNav, ClientBottomNav, CapacitorInit, OrderMonitor, Toast
  src/hooks/                usePartnerOrderMonitor (polling)
  src/config/api.ts         API_URL
*.md (root + app folders)   ~70 historical build/fix notes — mostly OUTDATED (see 10)
*.py, *.bat (root)          obsolete one-off scripts — do not run
```

**Ignore for code purposes:** `customer/android`, `customer/ios`, `partner/android`,
`partner/__MACOSX` (1,302 junk files), `node_modules`, `.next`, `out`, `dist`, committed
`.apk` / `.aab` binaries.

---

## 3. Data model (MongoDB `laundry`)

Defined in `admin panel/models/`. Key collections:

**Customer** — `name, mobile (unique), email, googleId, appleId, profileImage,
address[] {street,city,state,pincode,isDefault}, paymentMethods[] (incl. card + CVV — see 9.1),
walletBalance, loyaltyPoints, dueAmount, totalOrders, totalSpend,
referralCodes[] {code,used,usedBy,usedAt}, referredBy, usedVouchers[] {voucherCode,usedAt,orderId},
isActive`

- Google/Apple signups get a placeholder mobile: `google_<sub>` / `apple_<sub>`.

**Order** — the central document:
- `orderId` — 5-char random uppercase string shown to users (e.g. `ILKGB`). **Not** `_id`.
  Most APIs accept either; most PATCH/DELETE calls from the UI use `_id`.
- `customerId`, `partnerId`, `hub` (refs), `items[] {name,quantity,price}`, `totalAmount`
- `status` (see section 5), `statusHistory[]`
- `pickupAddress`, `deliveryAddress`, `pickupSlot {date,timeSlot}`, `deliverySlot`
- `paymentStatus`, `paymentMethod`, `razorpayOrderId`, `razorpayPaymentId`
- `appliedVoucherCode`, `previousDuePaid`, `expressDelivery`, `expressDeliveryFee`
- `cancellationFee/Reason/cancelledAt`, `deliveryFailureReason/Fee/deliveryFailedAt`
- `refunded`, `refundedAt`, `refundAmount`
- redelivery flags: `returnToHubRequested/Approved(+At)`, `redeliveryReturnRequested/Approved(+At)`,
  `redeliveryScheduled`, `orderSuspended`, `suspensionReason`
- timestamps per step: `reachedLocationAt, pickedUpAt, deliveredToHubAt, hubApprovedAt,
  ironingAt, processCompletedAt, outForDeliveryAt, outForRedeliveryAt, deliveredAt`
- `pickupPhotos[]` (base64 data URLs), `pickupNotes`, `specialInstructions`, `issue`,
  `adminNotes[]`

**Partner** — `name, mobile (unique), email, googleId, vehicleType/Number, aadharNumber,
aadharImage, drivingLicenseNumber, drivingLicenseImage, kycStatus (pending|approved|rejected),
kycRejectionReason, bankDetails{}, address{}, pincodes[] (service areas), isVerified, isActive`

**Hub** — `name, address{street,city,state,pincode[]}, pincodes[] (service pincodes), isActive`
**ServiceableArea** — `state, city, pincode, area, isActive` (drives "do we serve this pincode?")
**PricingCategory** / **PricingItem** — catalogue; items reference a category **by name**, not id.
**TimeSlot** — `time` (free text, e.g. "9 AM - 11 AM"), `type`, `availableFor (today|tomorrow|both)`, `order`
**OrderCharges** — single config document: `cancellationPercentage, customerUnavailable,
incorrectAddress, refusalToAccept, cancellationPolicyText, expressDeliveryPrice/Label/Description,
todaySlotsEnabled, tomorrowSlotsEnabled`
**WalletSettings** — single config document: `pointsPerRupee, minRedeemPoints, referralPoints,
signupBonusPoints, orderCompletionPoints, minOrderPrice`
**WalletTransaction** — audit trail of wallet/points changes
**Voucher** — `code, discount (percent 0-100), slogan, isActive`
**SubscriptionPlan** / **Subscription** — prepaid wallet top-up plans ("pay ₹X, get ₹Y wallet")
**Review** — order rating (1-5) + comment, `status` never moderated in UI
**AdminUser** — admin panel login: `username, role ('Admin' | 'Store Manager'), email, password, mobile, address, hub`
**Admin** (`models/Admin.ts`) — an older unused model. `AdminUser` is the live one.
**HeroSection** — banner images/videos shown on the customer home screen.
**Notifications** live in a raw collection `notifications` (no Mongoose model), accessed via
the native driver in `lib/mongodb.ts → connectToDatabase()`.

---

## 4. API surface (`admin panel/app/api/`)

All routes are unauthenticated (see 9.1). CORS is `*` for `/api/*` via `middleware.ts`.

**Auth**
| Route | Used by | Notes |
|---|---|---|
| `POST /api/auth/send-otp` | customer, partner | Sends OTP via Indori SMS. OTPs live in an **in-memory Map** (`lib/otpStore.ts`) — lost on restart. `+919999999999` / `123456` is a permanent test backdoor; outside production any number accepts `123456`. |
| `POST /api/auth/verify-otp` | customer, partner | Returns a JWT that nothing ever verifies. |
| `POST /api/auth/google-login` | customer, partner | Verifies the Google id_token against several client IDs. `role: 'customer' \| 'partner'`. |
| `POST /api/auth/apple-login` | customer (iOS) | Verifies the Apple identity token. |
| `POST /api/admin-login` | admin | Returns `{role,email,username,hub}`. No token/cookie. Falls back to plain-text password comparison if the stored value isn't a bcrypt hash. |

**Orders**
| Route | Notes |
|---|---|
| `GET /api/orders` | `?customerId=`, `?partnerId=`, `?hub=<name>`. With no filter it returns **every order**, populated with customer/partner name + mobile + email. Both mobile apps call it unfiltered — see 9.1. |
| `POST /api/orders` | Creates the order. Generates `orderId`, assigns a hub by pickup pincode, applies `walletUsed`, clears dues, records the voucher, awards points. **Only whitelisted fields are copied** — anything else the client sends is dropped (this is why express is lost, 9.2). |
| `GET/PATCH/DELETE /api/orders/[id]` | Accepts `orderId` or `_id`. PATCH `$set`s **whatever JSON you send** with `runValidators:false`, and contains the cancellation-fee and delivery-failure-fee logic. This is the single most important backend file. |
| `POST /api/orders/[id]/review` | Customer rating. |
| `POST /api/orders/[id]/refund` | Exists but the admin UI does NOT use it (9.2). |
| `POST/PATCH/DELETE /api/orders/[id]/notes[/noteId]` | Admin notes. |

**Customers / wallet**: `GET|POST /api/customers`, `GET|PATCH|DELETE /api/customers/[id]`,
`POST /api/customers/[id]/adjust` (wallet/points + creates a customer notification),
`POST /api/customers/bulk-adjust`, `POST /api/customers/[id]/clear-dues`, `POST /api/set-due`,
`GET /api/customers/high-value`, `GET /api/wallet-transactions?customerId=`,
`GET|POST /api/wallet-settings`

**Mobile-specific**: `POST /api/mobile/auth/login` (finds/creates a customer from a mobile
number — **no OTP proof required**), `GET|POST|PUT /api/mobile/profile?customerId=`,
`GET|POST /api/mobile/partners`, `GET|PATCH|PUT|DELETE /api/mobile/partners/[id]`,
`POST /api/mobile/partners/auth/login`, `GET|POST /api/mobile/partners/profile`,
`GET|POST /api/mobile/partners/kyc`, `POST|PUT /api/mobile/partners/kyc/[id]` (PUT = admin
approve/reject), `DELETE /api/mobile/partners/kyc/bulk-delete`,
`GET /api/mobile/notifications?audience=customers|partners&customerId=`

**Catalogue / config**: `GET|POST|PUT|DELETE /api/pricing` and `/api/pricing/categories`,
`/api/time-slots` (+`/reorder`), `/api/order-charges`, `/api/vouchers` (+`/available`, `/use`),
`/api/subscription-plans`, `/api/subscriptions`, `/api/hero-section`, `/api/hubs`,
`/api/serviceable-areas`, `GET /api/check-serviceable?pincode=`, `/api/locations/{states,cities,pincodes}`
(proxies to countrystatecity.in with a **hardcoded API key** and api.postalpincode.in),
`GET /api/partners?pincode=` (approved+active partners, for manual assignment)

**Payments**: `POST /api/razorpay/create-order`, `POST /api/razorpay/verify-payment`
(HMAC signature check only — it does not update anything).

**Misc / dangerous**: `/api/upload` (writes to `public/uploads/`, **no file-type check**),
`/api/notifications`, `/api/reviews`, `/api/reports`, `/api/reports/export`.
**Test routes that write to the database — do not call in production:** `/api/test-db`
(inserts on every GET), `/api/reports/test-data`, `/api/customers/test`, `/api/reviews/test`,
`/api/test-cancellation` (read-only), `/api/pricing/clear` (deletes all pricing items).

---

## 5. Order lifecycle — who sets what

Status enum (`models/Order.ts`):
`pending, reached_location, picked_up, delivered_to_hub, processing, ironing,
process_completed, ready, out_for_delivery, delivered, cancelled, delivery_failed, suspended`

| # | Step | Who / where | Status set | Also sets |
|---|---|---|---|---|
| 1 | Order placed | Customer `ContinueBooking.tsx` → `POST /api/orders` | `pending` | hub by pincode, `previousDuePaid` |
| 2 | Partner claims it | Partner `/pickups` | (unchanged) | `partnerId` |
| 3 | Arrived at customer | Partner `/pickups/start` | `reached_location` | `reachedLocationAt` |
| 4 | Clothes collected | Partner `/pickups/confirm` (≥2 photos) | `picked_up` | `pickupPhotos`, `pickupNotes`, `pickedUpAt` |
| 5 | Dropped at hub | Partner `/hub/drop` | `delivered_to_hub` | `deliveredToHubAt`, `hub` |
| 6 | Hub APPROVE | Admin orders list | `ready` | `hubApprovedAt` |
| 7 | IN PROGRESS | Admin orders list | `processing` | — |
| 8 | IRONING | Admin orders list | `ironing` | `ironingAt` |
| 9 | COMPLETED | Admin orders list | `process_completed` | `processCompletedAt` |
| 10 | Picked for delivery | Partner `/delivery/pick` → `/delivery/details` | `out_for_delivery` | `partnerId` (overwritten!), `outForDeliveryAt` or `outForRedeliveryAt` |
| 11a | Delivered | Partner `/delivery/details` | `delivered` | `deliveredAt` |
| 11b | Not delivered | Partner, pick reason(s) | `delivery_failed` | `deliveryFailureReason`, fee applied server-side |

Note the admin flow goes `ready` → `processing`, which reads backwards but is how it works.

**Failed delivery / redelivery loop**
1. `delivery_failed` → the order appears in the partner's `/hub/drop`.
2. Partner requests return → sets `returnToHubRequested` (status unchanged).
3. Admin `/admin/undelivered-orders` → APPROVE → `returnToHubApproved`, status `delivered_to_hub`.
4. Admin SETUP REDELIVERY (can change address and slot) → status `process_completed`,
   `redeliveryScheduled: true`. It reappears in the partner's delivery list tagged REDELIVERY.
5. If it fails again, the same loop runs with the `redeliveryReturn*` flags, and the admin can
   SUSPEND (`status: 'suspended'`, `orderSuspended: true`).

**Cancellation:** only the customer's `BookingConfirmation` screen and the admin (orders list
and order detail) can cancel. Everything happens in `PATCH /api/orders/[id]`.

---

## 6. Money rules — READ BEFORE TOUCHING

All of this lives in `admin panel/app/api/orders/[id]/route.ts` and `orders/route.ts`.

**Order total.** Calculated in the customer app (`ContinueBooking.tsx`):
```
totalAmount = itemsTotal − voucherDiscount + customer.dueAmount + expressFee
walletUsed  = min(walletBalance, totalAmount)
finalAmount = max(0, totalAmount − walletUsed)   // what Razorpay charges
```
The server **trusts** `totalAmount` and `walletUsed` as sent. Changing pricing rules means
changing the client, so old installed apps keep the old rules.

**Cancellation fee.** Charged only if `partnerId` is set on the order:
`fee = round(totalAmount × OrderCharges.cancellationPercentage / 100)` (default 20%).
Taken from `walletBalance`; any shortfall is added to `customer.dueAmount`.
A `WalletTransaction` row is written.

**Delivery failure fee.** Matched from the failure reason text:
`customerUnavailable` / `incorrectAddress` / `refusalToAccept` (defaults ₹150).
**The first failure is always free**; later ones accumulate into `deliveryFailureFee`.
Same wallet-then-due deduction.

**Dues.** `customer.dueAmount` is added to the next order's total and cleared when that
order is paid. Admin can clear it via the refund flow or `/api/customers/[id]/clear-dues`.

**Points.** `WalletSettings.orderCompletionPoints` are awarded in `POST /api/orders`
(on creation) **and again** on the `delivered` PATCH — points and `totalOrders` are
double counted today (9.2). Referral: a new customer enters a code at profile creation
(`referredBy`); on their first order the referrer gets `referralPoints` and the new user gets
`signupBonusPoints`, and the code is marked used.

**Vouchers.** Percentage-only, no expiry or minimum. Validated client-side. Marked used in
`Customer.usedVouchers` when the order is paid — and also when the customer taps "Copy Code"
on the home screen (9.2).

**Wallet top-ups ("subscriptions").** `POST /api/subscriptions` credits
`walletBalance += plan.walletCredit`. It does **not** verify the Razorpay payment (9.1).

**Refunds.** The admin order-detail screen computes the refund in the browser and issues three
separate calls (`/adjust`, `PATCH /api/customers/[id]`, `PATCH /api/orders/[id]`). It does not
use `/api/orders/[id]/refund`. Not atomic, and the maths double-charges or waives the fee
depending on how it was originally taken (9.2).

---

## 7. Authentication — how it actually works

**There is none at the API layer.** Tokens are issued and stored, never sent, never verified.
Every user-scoped call identifies the user with a `customerId` / `partnerId` query parameter
or body field.

**Customer app:** phone OTP (`send-otp` → `verify-otp` → `POST /api/mobile/auth/login`),
Google (web + native), Apple (iOS only).
localStorage keys: `customerId`, `authToken`, `userName`, `userMobile`, `customerMobile`,
`cartItems`, `hasSeenTopupModal`, `cached*` (profile/address/wallet), `wallet_*`,
`transactions_*`, `customer_notifications`, `cleared_/deleted_/pushed_notifications`.

**Partner app:** phone OTP → `POST /api/mobile/partners`, or Google.
localStorage keys: `partnerId`, `authToken`, `partnerMobile`, `partner_notifications`,
`partner_read_notifications`, `partner_deleted_notifications`.
KYC gates the app: `approved` → work screens; `pending`/`rejected` → `/profile/kyc-details`.

**Admin panel:** `POST /api/admin-login` → the response object is stored in
`localStorage.adminUser`. No token, no expiry, `middleware.ts` does not check pages.
Roles: `Admin` (everything) and `Store Manager` (Orders + Undelivered Orders only, and their
orders list is filtered by their hub's pincodes). Roles only hide sidebar links — every page
and API still works if the URL is typed directly. Logout just navigates away.

---

## 8. Build, deploy, environments

### 8.1 Local development
```bash
cd "admin panel" && npm install && npm run dev   # :3000  (needs .env.local)
cd customer      && npm install && npm run dev   # :3001
cd partner       && npm install && npm run dev   # :3002
```
The mobile apps point at `API_URL` (`src/config/api.ts`), which defaults to
`http://localhost:3000` when the env var is absent.

### 8.2 Environment variables
`admin panel/.env.local` (see `.env.example`):
`MONGODB_URI`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_ANDROID_CLIENT_ID`,
`GOOGLE_PARTNER_ANDROID_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID`, `GOOGLE_PARTNER_IOS_CLIENT_ID`,
`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
`INDORI_SMS_USERNAME` / `_PASSWORD` / `_SENDER_ID` / `_TEMPLATE_ID`,
`NEXT_PUBLIC_API_URL`. (`FIREBASE_*` is referenced by `lib/firebase.ts`, which nothing imports.)

`customer/.env.production`: `VITE_API_URL=https://acsgroup.cloud` (tracked in git)
`partner/.env.production`: `NEXT_PUBLIC_API_URL=https://acsgroup.cloud` (tracked in git)
These are **baked in at build time** — rebuild after changing them.

### 8.3 Mobile builds
```bash
# Customer (Vite → dist → Capacitor)
cd customer && npm run build && npx cap sync && npx cap open android

# Partner (Next static export → out → Capacitor)
cd partner && npm run build && npx cap sync android && npx cap open android
```
- Partner `next.config.ts`: `output:'export'`, `distDir:'out'`, `trailingSlash:true`, and it
  **ignores TypeScript and ESLint errors during build** — a broken type will ship silently.
- Partner dynamic routes (`delivery/[id]`, `pickups/start/[id]`, `pickups/confirm/[id]`) are
  **orphans**; real navigation uses query strings (`/pickups/start?id=`). Don't edit the
  `[id]` copies expecting a change in the app.
- Version numbers live in `android/app/build.gradle` (`versionCode`, `versionName`) and must be
  bumped for every Play Store upload.

### 8.4 Production
- PM2: `admin panel/ecosystem.config.js` — app `admin-panel`, `npm start`, cwd
  `/var/www/laundry-admin/admin panel`, single fork instance, port 3000.
  Deploy = `git pull` → `npm install` → `npm run build` → `pm2 restart admin-panel`.
- nginx: `nginx-fix.conf` (root) is the real config — TLS for `acsgroup.cloud`, 50 MB body
  limit, `/uploads/` served straight from disk via `alias`, everything else proxied to :3000.
  (`admin panel/nginx-upload-config.txt` is an older partial snippet.)
- Uploaded images/videos go to `admin panel/public/uploads/` on the server's disk. They are
  **not in git** and are not backed up by a redeploy — don't wipe that folder.
- Single PM2 instance matters: the OTP store is in-process memory. Clustering would break login.

### 8.5 Secrets already in git (do not add more)
`partner/partner-release-key.keystore`, `partner/partner-release-key-new.keystore`,
`partner/android/gradle.properties` (keystore passwords), both `google-services.json` files,
the countrystatecity.in API key in `app/api/locations/*`, and a Google Maps key in
`customer/.env.production`. Rotating the signing keystore is **not** possible for an app
already on the Play Store — protect those files.

---

## 9. Known bugs and landmines

Ask the owner before "fixing" anything here; some of it is load-bearing.

### 9.1 Security (high severity, by design decisions already made)
- **No API authentication anywhere.** Anyone who can reach `acsgroup.cloud` can read or modify
  any order, credit any wallet, approve their own KYC, or create an admin user via
  `POST /api/admin-users`. Fixing this properly means changing all three apps at once.
- `GET /api/orders` with no filter returns every order with customer names, phones and
  addresses. The partner app polls it every 10s (twice over — see 9.3) and the customer
  order-tracking screen every 5s.
- `POST /api/mobile/auth/login` returns a full customer record for any phone number, no OTP.
- `PATCH /api/orders/[id]` and `PATCH /api/mobile/partners/[id]` `$set` arbitrary fields.
- `POST /api/mobile/profile` matches `{ mobile: /^google_/ }`, so it can overwrite an
  **unrelated** Google user's record.
- Customer **card numbers and CVVs** are stored in `Customer.paymentMethods` and cached in
  localStorage. This contradicts the app's own privacy policy and is not PCI-compliant.
  They're only used as a Razorpay method hint — they don't need to be stored at all.
- `POST /api/subscriptions` credits the wallet without verifying the payment server-side.
- `/api/upload` accepts any file type into a public, same-origin folder (stored-XSS risk).
- Admin print-slip and report "PDF" build HTML with `document.write` from unescaped
  customer data.
- Full Aadhaar and bank account numbers are shown unmasked on the admin partner page.

### 9.2 Money and data correctness
- **Express delivery is never saved.** The customer app sends `expressDelivery` and
  `expressDeliveryFee`, but `POST /api/orders` doesn't copy them onto the Order, so the fee is
  charged (it's inside `totalAmount`) while the "⚡ Express" badges in the admin and partner
  apps never appear. Fix = whitelist both fields in `orders/route.ts`.
- **Order points are awarded twice** — once on creation, once on `delivered`. `totalOrders`
  is incremented twice too.
- **Wallet point redemption applies twice** (`Wallet.tsx` writes the new balance with PATCH,
  then calls `/adjust`, which applies the same delta again).
- **Refunds:** `/api/orders/[id]/refund` sets `refundProcessed` / `refundReason`, which don't
  exist in the schema, so its "already refunded" guard never works. The admin UI uses its own
  three-call flow instead, which double-charges the fee when it was taken from the wallet and
  waives it when it went to dues. It also refunds unpaid COD orders in full.
- Vouchers are marked used when the customer taps "Copy Code", before any order exists.
- `GET /api/vouchers` exposes every voucher code to anyone.
- Admin can cancel an order in **any** status, including delivered — silently triggering the
  percentage fee, with no warning shown.
- Dashboard "Revenue Today" includes cancelled orders.
- Invoices (both admin and customer) carry a hardcoded GSTIN `29ACLFAA519M1ZW`, "Tax (0%)",
  and print every amount prefixed `- Rs.` so values look negative. The customer invoice falls
  back to demo data (order `RW0R7`, a Rajkot address, phone `8140126027`) when fields are missing.

### 9.3 Runtime behaviour
- OTPs are stored in memory: a server restart invalidates every pending OTP, and the system
  cannot be clustered.
- Both mobile apps start their polling only at app launch, so notifications don't start after
  a login and keep running with the old user id after logout until the app restarts.
- The partner app runs its order monitor **twice** (`CapacitorInit` and `OrderMonitor` both
  call the hook), producing duplicate notifications and double the traffic.
- The customer `notificationService.addNotification` calls `toast(...)` which is never
  imported → `ReferenceError` on every new notification, which also aborts the rest of that
  poll's loop.
- Tapping a notification does nothing (the `notificationTap` / `notificationClick` events have
  no listeners).
- Customer pages register their own hardware back-button listeners and some call
  `App.removeAllListeners()`, which wipes the global handler.
- Partner `/hub/drop` processes **all** listed orders when nothing is selected, never checks
  `response.ok`, and always shows a success toast.
- Partner delivery pickup **overwrites** `partnerId`, so the pickup partner loses the order
  from their history and stats.
- Two partners can claim the same pickup (check and assign are separate, unconditioned calls).
- A rejected partner cannot edit their KYC — `/profile/kyc` and `/profile/kyc-details` bounce
  each other; only "Resubmit" (with unchanged documents) works.
- Time-slot strings are parsed with a regex that doesn't understand minutes
  ("10:00 AM - 12:00 PM" is never treated as passed). Disabling today/tomorrow slots hides the
  UI but doesn't block an already auto-selected slot.
- Admin date-range filters exclude the "To" day; the report export sends unconverted
  DD-MM-YYYY dates.
- Admin redelivery scheduling uses four **hardcoded** time slots, not the configured ones.

### 9.4 Inconsistencies to be aware of
- Customer app IDs differ: Capacitor/iOS `com.acsgroup.urbansteam.customer` vs Android
  `com.urbansteam.customerapp`. Versions: Android/package.json 2.1.0, iOS `MARKETING_VERSION 3.0`.
- `customer/src/components/LeafletMap.tsx` and the partner equivalent are **not** Leaflet —
  they're Google Maps `<iframe>` embeds. `leaflet`/`react-leaflet` are installed but unused.
- `customer/src/pages/VideoSplash.tsx` plays a Lottie animation, not `splash.mp4`.
- `customer/src/pages/Booking.tsx` is the **legacy** booking screen, reachable only from the
  Wallet and Refer & Earn nav bars. The live flow is `Prices → Cart → ContinueBooking`.
- `/admin/hubs` is an orphan page duplicating the Add-On → Hub tab; `/admin/settings` is a
  non-functional mock-up hidden from the sidebar.
- Hub `address.pincode` is a string on `/admin/hubs` but an array on the Add-On page.
- Unused code: `customer/src/utils/{api,http}.ts`, `services/googleAuth.ts`,
  `hooks/useNavigationSafe.ts` (not even valid TypeScript), `partner/src/services/orderMonitor.ts`,
  `partner/src/hooks/useCapacitorNavigation.ts`, `admin panel/lib/firebase.ts`,
  `models/Admin.ts`, `partner/public/splash-screen.html`.
- Unused dependencies: `firebase`, `twilio`, `@tanstack/react-query` (provider only),
  `@capacitor-community/http`.
- Partner Capacitor plugin versions are mismatched (core 7.4 with camera/filesystem/
  local-notifications/splash-screen at 8.x). Don't bump one without the others.

---

## 10. Documentation in this repo — treat with suspicion

~70 markdown files exist at the root and in `customer/` and `partner/`. Most are one-off build
notes from Oct–Dec 2025. Specifically:
- `TWILIO_SETUP.md`, `TWILIO_FIX.md`, `FIREBASE_SETUP.md` — **obsolete**. OTP now goes through
  Indori SMS (`admin panel/lib/indoriSms.ts`).
- `admin panel/ADMIN_USER_MANUAL.md` — a generic template describing features that don't exist
  (bulk order actions, voucher validity/limits, 2FA, audit logs, scheduled reports).
- `CANCELLATION_CHARGE_FIX.md`, `REDELIVERY_WORKFLOW.md` — still broadly accurate and useful
  for the redelivery flow.
- `SAFE_AREA_GUIDE.md`, the `GOOGLE_AUTH_*` and `BUILD_*` files — historical; verify against
  the code before following them.
- `recent_changes.patch` (1 MB) — an old diff dump, not applicable.

---

## 11. Where do I change X?

| Task | Touch these |
|---|---|
| Item prices / categories / images | Admin → Pricing. Data: `PricingItem`, `PricingCategory` |
| Pickup & delivery time slots | Admin → Add-On → Time Slot (`TimeSlot`); today/tomorrow master switches live in `OrderCharges` |
| Cancellation %, failure fees, policy text, express price/label | Admin → Add-On → Order Charges (`OrderCharges`); enforcement in `api/orders/[id]/route.ts` |
| Points, referral bonus, minimum order value | Admin → Add-On → Wallet & Pricing (`WalletSettings`) |
| Serviceable pincodes | Admin → Add-On → Pincode (`ServiceableArea`); checked by `/api/check-serviceable` |
| Hubs and their pincodes | Admin → Add-On → Hub (`Hub`); order→hub matching in `api/orders/route.ts` |
| Customer home banners | Admin → Add-On → Hero Section (`HeroSection`) |
| Wallet top-up plans | Admin → Subscriptions (`SubscriptionPlan`) |
| Order status flow | `models/Order.ts` enum + `api/orders/[id]/route.ts` + every screen that hardcodes the string |
| Customer booking flow | `customer/src/pages/{Prices,Cart,ContinueBooking}.tsx` |
| Customer order tracking UI | `customer/src/pages/OrderDetails.tsx` |
| Partner pickup flow | `partner/src/app/pickups/{page,start,confirm}` |
| Partner delivery flow | `partner/src/app/delivery/{pick,details}` |
| Admin order management | `admin panel/app/admin/orders/page.tsx` and `orders/[id]/page.tsx` |
| Invoices | `customer/src/utils/generateInvoice.ts`, `generateSubscriptionInvoice.ts`, and the jsPDF block inside `admin panel/app/admin/orders/[id]/page.tsx` |
| API base URL | `customer/src/config/api.ts` + `.env.production`; `partner/src/config/api.ts` + `.env.production` |

---

## 12. Conventions

- **Brand colours:** gradient `linear-gradient(to right, #452D9B, #07C8D0)`; purple `#452D9B`,
  cyan `#07C8D0`, disabled `#9ca3af`. Fonts: Montserrat + Manrope.
- **API response shape:** `{ success: boolean, data?, error?/message? }` — except
  `/api/reviews` and `/api/serviceable-areas`, which return raw arrays.
- Styling: Tailwind + inline styles in the admin panel; Tailwind + shadcn in the customer app.
- Data fetching: plain `fetch` written inline in each component. No shared client, no React
  Query usage (the provider exists but is unused), no retries.
- Images (profile photos, KYC documents, pickup photos) are sent and stored as **base64 data
  URLs inside MongoDB documents**, not as files. Watch document size.
- The codebase is full of `console.log` debugging, especially in the order routes. Keep or
  remove deliberately — some of it is how the team debugs production.
- `admin panel` has a space in its folder name: always quote it in shell commands.

---

## 13. Suggested working method for changes

1. Restate what should change and which of the three apps it affects.
2. Grep for every consumer of the data or endpoint before editing.
3. Check whether installed old app builds would break (see rule 3 in section 0).
4. Make the smallest change that works; match the surrounding style.
5. `npx tsc --noEmit` in the app you changed (partner and customer are not type-checked at
   build time, so this is the only safety net).
6. Test the full path, not just the screen: place an order, move it through the partner app,
   and check the admin panel.
7. Tell the owner explicitly if your change requires a new mobile build.
8. Update this file when the architecture changes.
