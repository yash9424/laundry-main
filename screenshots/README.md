# Subscription & wallet screenshots (V1-016)

Captured 25 Sep 2026 from the apps running locally against the **local** MongoDB.
Production was never touched.

These show the subscription / wallet flow after the V1-016 security fixes.

| File | Screen | What to look at |
|---|---|---|
| 01-customer-subscription-plans | Customer → Top-Up Wallet | The three plans, price vs wallet credit, benefits |
| 02-customer-my-subscription | Customer → My Subscriptions | Purchased plan: Amount Paid ₹1000 → Wallet Credited ₹1250, status Active |
| 03-customer-my-subscription-receipt | Customer → Receipt popup | Receipt with payment id, downloadable as PDF |
| 04-customer-wallet-credit-trail | Customer → Wallet | **The proof:** balance ₹440 → ₹1690 and a new history row "Wallet top-up — Saver plan (₹1000) +₹1250". Before the fix the credit left no trail at all |
| 05-admin-subscription-plans | Admin → Subscriptions → Plans | Plan management |
| 06-admin-subscribers | Admin → Subscriptions → Subscribers | Who bought what, amount paid, wallet credited |

## Demo data

The purchase shown was made through the real API (`POST /api/subscriptions`), so it
exercised the fixed credit path end to end. The plans and the subscription are tagged
`__demoSeed: true`. To remove them:

```js
// mongosh "mongodb://localhost:27017/laundry"
db.subscriptionplans.deleteMany({ __demoSeed: true });
db.subscriptions.deleteMany({ __demoSeed: true });
// and, if you want the wallet back to ₹440:
db.customers.updateOne({ _id: ObjectId("690877460c44c1afd6840b79") }, { $inc: { walletBalance: -1250 } });
db.wallettransactions.deleteMany({ reason: /Wallet top-up/ });
```
