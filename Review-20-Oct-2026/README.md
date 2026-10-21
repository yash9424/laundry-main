# App Review of 20 October 2026 — what changed

Every point from `20-Urban_Steam_Additional_App_Review_October_2026.pdf`, with a
screenshot of the result. The shots were taken from the real Customer app,
Captain app and admin panel running against a test database, at phone size
(390 × 844) and, for the admin panel, at desktop size.

`Urban-Steam-Customer-Data-Security.pdf` answers point 7 and is written to be
sent to the client as it is. `customer-data-security.html` is the source it was
made from, kept so the wording can be edited and the PDF regenerated.

---

## 1. Standard & Express delivery

**Remove the Express toggle from Standard orders.** The delivery type is now
settled before the slots, and the final step shows the Express row only when
Express was the choice — because the two have different pickup slots, and
turning Express on at the end used to add the fee while leaving a Standard slot
in place.

| | |
|---|---|
| [`01-point1a-standard-no-express-row.png`](screenshots/01-point1a-standard-no-express-row.png) | Standard chosen — no Express row anywhere on the final step |
| [`02-point1a-express-row-selected.png`](screenshots/02-point1a-express-row-selected.png) | Express chosen — the row appears, marked **Selected**, and the fee is in the total |
| [`03-point1a-delivery-type-chosen-first.png`](screenshots/03-point1a-delivery-type-chosen-first.png) | Where the choice is made: the home screen, before any slot is picked |

**The note on the time-slot screen**, in the client's words, under the slot list:

| | |
|---|---|
| [`04-point1b-more-slots-note.png`](screenshots/04-point1b-more-slots-note.png) | "More pickup slots are added regularly. Please check back if your preferred slot is unavailable." |

## 2. Special Pickup Instructions

"Additional Notes" is now **Special Pickup Instructions**, with the suggested
line above the box.

| | |
|---|---|
| [`05-point2-special-pickup-instructions.png`](screenshots/05-point2-special-pickup-instructions.png) | The renamed section and its new wording |

## 3. Discount calculation

This was a real fault, not a display problem. When the order was submitted, the
server checked the breakdown against the total it was asked to charge and, when
they disagreed, **rewrote the discount** to make the arithmetic close — so a 20%
voucher on an ₹800 order could be stored and printed as a ₹340 discount. It also
cleared the customer's whole outstanding due on any paid order, whether or not
that order had charged for it.

The figure that actually moves is the due: the checkout screen reads it once
when it opens, and an earlier order or an admin adjustment can clear it while
the customer is still choosing a slot. So the due covered by the payment is now
the derived figure, the voucher keeps its own percentage, and only the part of
the due the customer really paid is settled.

| | |
|---|---|
| [`06-point3-discount-breakdown.png`](screenshots/06-point3-discount-breakdown.png) | ₹800 of garments, 20% voucher = **−₹160**, previous due **+₹200**, **₹840 to pay** |
| [`07-points3-4-6-order-confirmed.png`](screenshots/07-points3-4-6-order-confirmed.png) | The same figures on the confirmation, and the bill adds up: 800 − 160 + 200 = 840 |

## 4. Back navigation and duplicate orders

- The confirmation screen offers **Track Order** and **Home**, and nothing that
  leads back to the cart. Cancelling stays reachable as a link — this is the only
  screen a customer can cancel their own order from — rather than a third button
  competing with the two.
- Home and the device back button both **replace** the screen, so the
  confirmation cannot be reached again by going back.
- The order button latches on the first tap, so a double tap cannot submit
  twice, and the server still refuses an identical order placed within two
  minutes. That second guard is what protects the builds already on people's
  phones.

| | |
|---|---|
| [`07-points3-4-6-order-confirmed.png`](screenshots/07-points3-4-6-order-confirmed.png) | The two actions, with cancellation demoted to a link |

## 5. Referrals and wallet rewards

- The **Invite a friend to Urban Steam** button on the Wallet screen had no
  handler at all, so it did nothing. It now opens Refer & Earn, where the
  customer's own code is loaded and shared from.
- The referred customer is credited **₹30 to their Urban Steam Wallet** (the
  referrer gets ₹50). No points are involved anywhere: the points system is gone
  and rewards are rupees in the wallet, paid when the new customer's first order
  is placed.

| | |
|---|---|
| [`08-point5a-invite-a-friend-button.png`](screenshots/08-point5a-invite-a-friend-button.png) | The invite button, now working |
| [`09-point5b-referral-rewards-in-rupees.png`](screenshots/09-point5b-referral-rewards-in-rupees.png) | "Get ₹50 in your wallet when a friend places their first order. They get ₹30 too." |

> **One setting to change on the live server.** The ₹30 figure is a value in the
> database, not in the code, and the live record still reads ₹25. Set it in
> **Admin → Add-On → Wallet & Pricing** after the deploy.

## 6. Payment method on the confirmation

The confirmation used to show whichever method was marked primary on the
profile — "UPI" even when the wallet had paid for everything. It now reports
what actually happened: **Urban Steam Wallet** for a wallet-only order, and both
methods with the amount paid through each when a payment was split.

| | |
|---|---|
| [`07-points3-4-6-order-confirmed.png`](screenshots/07-points3-4-6-order-confirmed.png) | Paid from Wallet ₹840 → Payment Method: **Urban Steam Wallet** |

## 7. Customer data security

Answered in full in [`Urban-Steam-Customer-Data-Security.pdf`](Urban-Steam-Customer-Data-Security.pdf)
— four pages covering where the data is kept, how it travels, who can sign in
and how, the specific records the client listed, payments, patching, and a dated
list of what is being strengthened next.

## 8. Service-area screen

| | |
|---|---|
| [`10-point8-service-area-message.png`](screenshots/10-point8-service-area-message.png) | "Congrats! / You're in our service area. / Exceptional garment care, delivered to your doorstep. Your Urban Steam experience starts here." |

## 9. Captain app — a simpler pickup schedule

The list was one flat column in whatever order the server returned it, so a
Captain working the 9–11 window had to read every card to find the four that
belonged to it. The same cards now sit under a heading per date and per slot,
each showing how many pickups it holds, in the order a Captain works them. A
slot label that cannot be read sorts last rather than scrambling the list.

| | |
|---|---|
| [`11-point9-captain-pickups-grouped.png`](screenshots/11-point9-captain-pickups-grouped.png) | TODAY → 9:00 AM, 3 pickups |
| [`12-point9-captain-slot-boundary.png`](screenshots/12-point9-captain-slot-boundary.png) | Where one slot ends and the next begins |
| [`13-point9-captain-full-schedule.png`](screenshots/13-point9-captain-full-schedule.png) | The whole day in one image |

---

## Also added: one switch that takes both apps offline

Asked for alongside the review. **Admin → Settings → App availability** is a
single switch for *both* the Customer app and the Captain app. Turned off, every
user sees one "we will be right back" screen instead of the app — no bookings,
no pickups, nothing half-working — with a heading and message the admin can
edit.

It rides on a setting both apps already read, so there is no new endpoint and
builds that predate it simply ignore it. Both apps **fail open**: if the check
errors, times out, or the phone is offline, the app carries on as normal, so a
weak signal never looks like a shutdown. The apps pick up a change within a
minute, and immediately when someone reopens them.

| | |
|---|---|
| [`14-switch-admin-apps-live.png`](screenshots/14-switch-admin-apps-live.png) | Normal state — apps live |
| [`15-switch-admin-apps-offline.png`](screenshots/15-switch-admin-apps-offline.png) | Switched off — the card turns red and says so |
| [`16-switch-admin-confirmation.png`](screenshots/16-switch-admin-confirmation.png) | The confirmation the admin gets |
| [`17-switch-customer-app-screen.png`](screenshots/17-switch-customer-app-screen.png) | What a customer sees |
| [`18-switch-captain-app-screen.png`](screenshots/18-switch-captain-app-screen.png) | What a Captain sees |

---

## What needs a new app build

| Change | Where it takes effect |
|---|---|
| Points 1, 2, 4, 5a, 6, 8 and the customer unavailable screen | **Customer app** — needs a new build and release |
| Point 9 and the Captain unavailable screen | **Captain app** — needs a new build and release |
| Point 3 (discounts and dues), point 5b (₹30), the admin switch | **Server only** — live as soon as the admin panel is deployed |

The server changes are backwards compatible: builds already on people's phones
keep working exactly as before, and the discount fix applies to them too, because
it runs on the server.
