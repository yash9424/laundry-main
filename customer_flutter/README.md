# customer_flutter — the customer app, rewritten in Flutter

A Flutter rewrite of [`customer/`](../customer), which is React + Vite inside
Capacitor. Same backend, same screens, same flows. It is built to ship as an
**update to the published app**, not as a new one.

## Identity — do not change any of this

| | Value | Why |
|---|---|---|
| Android `applicationId` | `com.urbansteam.customerapp` | what is on Play; a different id becomes a separate listing |
| iOS bundle id | `com.acsgroup.urbansteam.customer` | what is on the App Store — deliberately **not** the same as Android |
| Signing key | `../customer/android/app/laundry-customer.keystore` | Play rejects an upload signed with anything else, and this cannot be undone |
| `versionCode` | 16 (the Capacitor build shipped 15) | Play needs a higher one every upload |
| `versionName` | 2.4.0 | the Capacitor build shipped 2.3.3 |
| `minSdk` | 24 | Flutter's floor. The Capacitor build was 23, so phones on Android 6.0 stop getting updates |
| `targetSdk` / `compileSdk` | 35 | same as the Capacitor build |

`android/key.properties` holds the signing credentials and points at the one
existing keystore, so there is no second copy of the key. It is gitignored, as
is any `*.keystore` / `*.jks`.

## Build

```bash
flutter pub get
flutter analyze            # must be clean
flutter test
flutter build apk --release        # build/app/outputs/flutter-apk/
flutter build appbundle --release  # for the Play Store
```

The API base URL defaults to `https://acsgroup.cloud`
([lib/config/api.dart](lib/config/api.dart)). For local work against the admin
panel on your machine:

```bash
flutter run --dart-define=API_URL=http://10.0.2.2:3000   # 10.0.2.2 = host, from the emulator
```

## Layout

```
lib/
  main.dart            app, lifecycle, notification taps
  routes.dart          route names match the web app's paths
  config/api.dart      API base URL
  theme/brand.dart     #452D9B -> #07C8D0, Montserrat + Manrope
  content/legal.dart   Terms and Privacy copy, extracted from the TSX screens
  models/              order, customer, catalogue, charges, checkout
  services/
    api.dart           every endpoint the app calls, in one place
    store.dart         stands in for localStorage (SharedPreferences)
    cart.dart          the cart, persisted
    payments.dart      Razorpay checkout as a single awaited call
    notifications.dart order status polling + the phone's notification drawer
    invoice.dart       the tax invoice PDF
  screens/             28 screens, one file each
  widgets/             shared UI
```

## How the look was matched

Not by reading the TSX alone -- that is what made the first attempt miss. The
published 2.3.3 APK was installed on an emulator and walked screen by screen,
and each screen here was then built against those captures plus the exact
Tailwind classes. Three things that reading alone got wrong:

- **`text-primary` is `#0080FF`, a blue**, not the brand purple. It is what
  "Congrats!", "Change Pincode", "Change number" and the links are painted in.
- **A disabled button keeps its gradient at 50% opacity** (the shadcn Button
  base sets `disabled:opacity-50`). Only the profile and cart screens override
  that with a flat `#9ca3af`.
- **The radius scale is not stock Tailwind.** `tailwind.config.ts` redefines
  lg/md/sm from `--radius: 1rem`, so `rounded-lg` is 16px and `rounded-xl` is
  12px -- lg is *larger* than xl, and a `w-8 h-8 rounded-lg` button is a circle.

Two more worth remembering when touching this code:

- The WebView viewport is about 411 CSS px, which is under Tailwind's `sm`
  breakpoint, so **every `sm:` class in the original is dead code on a phone**.
  Only the base values apply.
- The design tokens in `index.css` are HSL: `--foreground` is pure black,
  `--muted-foreground` is `#737373`, `--border` is `#E2E8F0`, `--input` is
  `#E5E7EB`. They are all in `lib/theme/brand.dart`.

## What the live run caught

The port was then run end to end against the production server
(`https://acsgroup.cloud`) on an emulator: sign in, add an address, build a
cart, apply a voucher, pick a slot, place the order, track it, download the
invoice, then cancel. Five things only showed up that way, and all five are
fixed:

- **The map tile printed "The Google Maps Embed API must be used in an
  iframe."** `LeafletMap.tsx` puts that URL in an `<iframe>`; the webview was
  loading it as the top-level document, which Google refuses. `address_map.dart`
  now loads a one-line page that holds the iframe, so it draws what the web
  build draws.
- **Back from the Order Confirmed screen closed the app.** Placing an order
  clears the stack behind that screen, so there was nothing to pop. `main.dart`
  now applies the rule `App.tsx` applied globally: only `/home` exits, and a
  screen with nothing behind it goes home.
- **"Download Invoice" always failed.** The three-column header used
  `CrossAxisAlignment.stretch`, which leaves the row unbounded inside a
  `MultiPage` and fails the whole document. It is a `pw.Table` now, which draws
  the same full-height column rules.
- **The booking-history filters stacked one per row.** `Container(alignment:)`
  wraps its child in an `Align`, which grows to fill the loose constraints a
  `Wrap` hands out. The padding sets the size instead, so the four chips sit
  inline the way `flex flex-wrap` puts them.
- **Notification times read "13m ago" under an hour** where
  `Notifications.tsx` says "Just now".

Worth knowing for the next person: the emulator and a Gradle build do not fit
in memory together on this machine -- run `./android/gradlew --stop` before
starting the emulator, and never build while it is running.

## What is deliberately different from the web app

Everything else is a faithful port. These are the exceptions, each for a reason:

1. **Card numbers and CVVs are not stored.** The app only ever used a saved
   payment method's *type* (and the UPI id) as a hint for the Razorpay sheet.
   Only the last four digits are kept, so the customer can recognise the card.
   Storing a CVV broke the app's own privacy policy and is not PCI compliant.
2. **Order screens fetch one order, not all of them.** `GET /api/orders` with no
   filter returns every customer's orders, with names, phone numbers and
   addresses. The tracking screen polled it every five seconds. These screens
   call `GET /api/orders/{id}` instead.
3. **The invoice prints nothing where a field is missing.** The web version fell
   back to sample values — a Rajkot address, the phone number 8140126027 and
   order id RW0R7 — which ended up on real customers' tax invoices.
4. **The pin-your-location map uses OpenStreetMap tiles.** The web version needs
   the Google Maps JavaScript API, which needs billing enabled on the Google
   Cloud project; until that is switched on it shows an error and no map. The
   coordinates it produces are the same latitude/longitude the captain's app
   navigates to. Switch to `google_maps_flutter` once billing is on, if wanted.
5. **The wallet screen uses the shared bottom bar.** The web screen carried its
   own copy whose middle button went to the legacy `/booking` page.
6. **Addresses are saved as objects, not re-parsed from their display text.**
   The web screen rebuilt them by splitting strings, which dropped the
   dropped-pin coordinates and mangled any city containing a comma.
7. **The order uses the address marked as default**, not whichever happens to
   be first in the list. The web screen always sent `address[0]` as the pickup
   address, so a customer who marked their second address as the default still
   had the first one collected from.
8. **The splash never waits on the animation.** Two timers that nothing can
   cancel open the app whatever the animation does. This is the bug that made
   the 2.3.3 Capacitor build refuse to open on some phones.

## The one thing that cannot be avoided

**Every customer will be signed out by this update.** The Capacitor build kept
the session in the WebView's `localStorage`, which a Flutter build cannot read.
Signing in again is one OTP, but it will generate support calls, so tell people
before rolling out — and roll out in stages (10% first) so it can be halted.
