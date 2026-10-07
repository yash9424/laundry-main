# Urban Steam — App Review of 1 October 2026

All 44 points, and where each one stands. Screenshots in this folder are named by
the point number, so the file name tells you which item it proves.

**43 fixed · 1 left with the SMS provider**

---

## Fixed, with a screenshot here

| Point | Raised | Screenshot |
|---|---|---|
| 1 | Motion graphic does not complete | `Point 01` |
| 3 | OTP timer to 60 seconds | `Point 03` |
| 6 | Apply voucher directly at checkout | `Point 06` |
| 7 | Grand Total breakdown | `Point 07+44` |
| 8 | Before Your Pickup before payment | `Point 08` |
| 9 | Options not fully visible | `Point 09` |
| 10 | 560032 shows "Coming soon" | `Point 10` |
| 11 | Google Maps integration | `Point 11` |
| 12 | Pin my location | `Point 12` |
| 13 | Captain navigation | `Point 13`, `Point 13b` |
| 14 | Cart total bar not visible | `Point 14` |
| 15 | Cart should be saved | `Point 15` |
| 16 | Confirm before deleting the cart | `Point 16` |
| 17 | Cart visible to Captain after Reached Location | `Point 17+30` |
| 18 | Show actual dates | `Point 18+19` |
| 19 | Standard — minimum 4 days | `Point 18+19` |
| 20 | Express — separate slots | `Point 20` |
| 21 | Past slots should disable | `Point 21` |
| 22 | Express booking later in the day | `Point 22` |
| 23 | Increase garment image size | `Point 23+24` |
| 24 | Tap image to see the garment | `Point 23+24` |
| 25 | Garment Care Note | `Point 25` |
| 26 | Confirmation screen starts at the bottom | `Point 26` |
| 27 | Remove Expected Delivery Time | `Point 27` |
| 28 | Cancel Booking after delivery | `Point 28` |
| 29 | Captain Order Summary | `Point 29` |
| 30 | Cart visibility during pickup | `Point 17+30` |
| 32 | Rename "Subscriptions" | `Point 32` |
| 33 | Plan card size on home | `Point 33+34` |
| 34 | "View All Plans" always available | `Point 33+34` |
| 35–38 | Remove the Points system | `Point 35+36+37+38` |
| 41 | Wallet / account isolation | `Point 41` |
| 43 | Order ID numbering | `Point 43` |
| 44 | Final checkout breakdown | `Point 07+44` |

## Fixed, but nothing to photograph

| Point | Raised | Why there is no screenshot |
|---|---|---|
| 2 | Old logo on some devices | It was the app framework's default placeholder, replaced in all 11 sizes. It only shows while a phone is launching the app, so a browser cannot capture it. |
| 4 | "OTP expired" within the allowed time | Fixed in the server and live since 1 October. There is no new screen — the old error simply no longer appears. |
| 31 | Notifications from another account | Notifications were stored against the phone rather than the customer. Now kept per account and cleared on sign-out. Showing it would need two accounts on one handset. |
| 39 | Wallet balance disappeared | Caused by the Redeem Points button dividing by a setting that was zero. The whole Points system is gone, so the button no longer exists. |
| 40 | Second purchase not credited | Same cause: once a balance was emptied, the database refused every later credit. Credits now repair a broken balance first. |
| 42 | Terms & Conditions checkbox | It was never missing. It is present and mandatory on both phone and Google sign-up — the button stays disabled until it is ticked. |

## Still open

| Point | Raised | Status |
|---|---|---|
| 5 | OTPs arriving late | **With the SMS provider.** The app sends the moment the number is entered — the server log timestamps confirm it. The delay is in delivery by Indori SMS. Nothing in the app can speed that up; it needs taking up with them, or moving to another gateway. |

---

## Two things outside the code that need doing

**1. Google billing is switched off.**
Google's own message from the browser console:

```
Directions Service: You must enable Billing on the Google Cloud Project
MapsRequestError: DIRECTIONS_ROUTE: REQUEST_DENIED
```

Because of this the live map carries a "For development purposes only" watermark
and draws a direct line instead of following the roads. Everything else works
today — the pin, the captain's live position, the distance counting down, and the
Navigate button. The road route and the written next turn are already built and
switch themselves on the moment billing is enabled.

To fix: Google Cloud console → the project holding the maps key → enable Billing,
and make sure **Maps JavaScript API** and **Directions API** are both on.

**2. Three customer wallets still need repairing.**
Three accounts were caught by the balance fault before it was fixed and are still
empty in the database. The code can no longer cause it, but those three need
putting right. A repair tool is ready and lists each customer's history first, so
the amount owed can be checked before anything is credited.

---

## Two decisions still worth confirming

Point 22 is built with sensible defaults rather than left waiting — same-day
Express closes at **6 PM**, and a slot must start at least **90 minutes** ahead.
Both are set from the admin panel. Point 43 is the same: sequential numbering is
built and switched off, waiting only for the prefix and starting number.

Tell us different numbers and they take effect immediately; no further work needed.
