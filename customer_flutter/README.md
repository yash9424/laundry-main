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
| `versionCode` | 17 (the Capacitor build shipped 16) | Play needs a higher one every upload |
| `versionName` | 2.4.0 | the Capacitor build shipped 2.3.4 |
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

## Pictures off the server

Every remote picture goes through `widgets/remote_image.dart` rather than
`Image.network` directly, and new code should keep doing that.

`Image.network` draws nothing at all while it is downloading. The banners the
admin uploads are not small -- the ones in production today run from 190 KB to
4.6 MB -- so the home screen opened as an empty panel and filled in seconds
later, which reads as a broken page rather than a loading one. The whole app
looked unfinished because of it. `RemoteImage` shows a quiet shimmer in the
meantime, fades the picture in, and falls back to something sensible if the
download fails.

It also caps the decode size. A 4.6 MB screenshot decoded at full resolution
costs tens of megabytes for a banner a few hundred pixels wide, which on a
mid-range phone is enough on its own to make the home screen stutter.

The upstream fix is to stop serving multi-megabyte PNGs as banners -- the admin
upload route does not resize anything (CLAUDE.md 9.1 notes it does not even
check the file type). Until that changes, this keeps it from looking broken.

## The vertical offset on the sign-up screens

Welcome, Check Availability, Congrats, Not Available, Create Profile and
Verify Mobile carry a `safe-top` class in the web app, which adds
`env(safe-area-inset-top)` as padding on top of a WebView that already begins
below the status bar. Those six screens use `QuirkSafeArea` here so the same
padding lands in the same place.

It does not close the gap entirely, and the rest is not padding. The shipped
app leaves the status bar invisible on its pre-login screens -- there is no
clock or battery drawn over them -- so the page has the whole screen to centre
itself in and sits a little lower. After sign-in the status bar comes back and
the two line up. Hiding the status bar is not reproduced: it would be copying
a fault rather than a design, and it only shows on screens nobody sees side by
side.

Worth knowing when reading `QuirkSafeArea`: padding a centred layout moves its
contents by half the padding, not all of it, because the centre of what is
left also moves. The web behaves the same way, which is the point.

## The second pass, with the Captain port's findings applied

Porting the Captain app turned up two things that were wrong here as well, and
a sweep of the screens the first pass had not reached turned up three more.

- **Material's letter spacing.** Every Flutter `Text` inherits a letter-spacing
  from the Material text theme -- 0.25 on `bodyMedium` -- that CSS does not
  have. It is about four per cent of a line's width: small enough to look like
  nothing on its own, large enough to wrap a filter chip or an address a word
  early. `Brand.theme()` zeroes it across the text theme and gives body text
  the `line-height: 1.5` that Tailwind's preflight puts on `html`.
- **Headings with no `text-*` class.** `index.css` has
  `h1 { @apply text-base font-bold }` down to `button { @apply text-xs }`
  inside `@layer base`, so a class on a heading still wins -- but a heading
  *without* one takes the base size. "Order summary", "Slots for today" and
  the legal text were being sized by eye rather than by that rule.
- **Refer & Earn had drifted.** The web screen was rewritten when the referral
  reward moved to wallet credit, and this port still had the older shape: no
  banner illustration, "Both Earn" instead of "You Earn", and neither the
  "Your Rewards" nor the "Past Referrals" card. It also said "Share Code",
  which is behind an `xs:` breakpoint Tailwind does not define, so the button
  only ever reads "Share".
- **Rate Your Order was a different screen.** It had a big round badge and
  "How was order #X?"; the web app shows the order as a card and asks "How was
  your experience?" underneath, with a grey `Submit Rating` and a `Skip` below
  it.
- **The garment icon.** Booking History and Rate Your Order were drawing
  Material's `dry_cleaning` where the web uses lucide's `Shirt`, which
  `lib/widgets/lucide.dart` already carries for the other screens.
- **Wallet Plans was a list.** The web screen is a hero band, a sideways strip
  of every plan, and the selected one opened out underneath with its picture,
  what it is worth and what it buys. My Wallet Plans' empty state had its own
  wording and a diamond where the web has a clipboard and "No subscriptions
  yet."
- **Order Confirmed had Status and Payment Method the wrong way round**, and
  painted Order Total and Status in the brand purple where the markup asks for
  `text-primary`, which this app defines as `#0080ff`. Its rows also split the
  width evenly, so a six-item order wrapped onto two lines when
  `justify-between` would have fitted it on one.
- **The slot screen's Confirm Order greys out differently.** It is
  `bg-gray-300 text-gray-500` there, not the faded gradient the rest of the app
  uses -- the one button in the app that does this.

## The third pass: the screens and bars that were still missing

- **The legacy `/booking` screen was not here at all.** "Book Your Order" is
  the screen the app booked on before the catalogue and the cart, and nothing
  in the live flow points at it -- but the bottom bars on Wallet and Refer &
  Earn still do, so a customer can land on it. `lib/screens/booking.dart` is a
  port of it, bugs included: the clock that greys out passed slots cannot read
  minutes, so "10:00 AM - 12:00 PM" is never treated as having gone.
- **Wallet and Refer & Earn carry their own bottom bars.** Neither uses the
  shared one: the icons have no labels, the middle button is blue and goes to
  `/booking`, the profile icon is lit whatever the route, and the two copies
  are not even the same size as each other. `LegacyBottomNav` takes both sets
  of measurements.
- **Notifications was a different screen.** The web app draws an emoji per
  order status, a four-pixel blue bar down the left of anything unread, a
  trash button beside the timestamp and a blue dot under the message, and it
  carries the bottom bar. It also offers an "Enable Notifications" card when
  the system permission is missing, which this port now asks for and shows.
- **The blue icons inside the profile fields are real.** They are absolutely
  positioned siblings of the input, and CSS paints positioned elements after
  in-flow ones -- so they sit on top of the input's white background rather
  than behind it. Create Profile and Edit Profile were drawing the `pl-10` gap
  with nothing in it.
- **Add Address was a form of labelled boxes.** The web screen lists the saved
  addresses with a red Delete on each, hides the form behind a dashed
  "+ Add New Address" button, and uses pill-shaped inputs with placeholders in
  the order Line 1, Line 2, City, State, Pincode -- then a round Primary radio
  and a fixed footer with Cancel beside Save Address.

## The fourth pass: a call-by-call audit against the shipped app

Every backend call the shipped app makes was put beside this one's. The order
payload is field-for-field identical -- which matters, because the route copies
only the fields it knows and silently drops the rest -- as are the Razorpay,
wallet top-up, voucher, profile and notification flows. These did not match.

- **A submitted review always said it had failed.** The review route answers
  with the saved document rather than the usual `{success, data}` envelope, so
  a perfectly good 201 parsed as a failure: the rating was written and the
  customer was told it was not, and trying again got "Review already exists".
  That one call now reads the status code, as the web screen does.
- **The invoice could come out with no name and no number.** It printed
  whoever was signed in on the phone, and a customer who signed in with Google
  or Apple has neither stored. It now takes them off the order, which the
  route populates with the customer's name and mobile.
- **A social sign-in stored no name at all.** Both routes return `data.name`;
  this read `data.customer.name`, found nothing, and the home screen greeted
  nobody.
- **Signing out left the previous customer's notifications on the phone.**
  They are stored one key per customer -- the name with `_<customerId>` on the
  end -- so clearing the bare names matched nothing. The sweep now clears by
  prefix, and the express/standard choice with them.
- **A card or bank method added here showed blank in the admin panel.** It
  gates the detail block on `cardNumber` / `accountNumber`, which this app
  stopped writing when it stopped storing card numbers. The last four digits go
  in those fields as well, so the admin prints `****1234` and the full number is
  still never stored.
- **The Razorpay sheet opened on its own front page.** The web app passes the
  saved method's type as `method`, so it opens on UPI, card or netbanking as
  chosen, and prefills the name from the profile rather than from storage.
- **There was no receipt for a wallet top-up.** My Wallet Plans now has the
  web screen's two tiles, its View Receipt modal and its downloadable PDF.
- **`Api.postProfile` was dead and wrong.** Its comment said addresses and
  payment methods POST rather than PUT; the POST route only ever sets name,
  email, mobile and referral code. Nothing called it, and it is gone.

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
   navigates to, and the card is the same card -- but it says "Tap or drag the
   pin", because tapping is how this map sets it. Switch to
   `google_maps_flutter` once billing is on, if wanted.
5. **Addresses are saved as objects, not re-parsed from their display text.**
   The web screen rebuilt them by splitting strings, which dropped the
   dropped-pin coordinates and mangled any city containing a comma.
6. **The order uses the address marked as default**, not whichever happens to
   be first in the list. The web screen always sent `address[0]` as the pickup
   address, so a customer who marked their second address as the default still
   had the first one collected from.
7. **The splash never waits on the animation.** Two timers that nothing can
   cancel open the app whatever the animation does. This is the bug that made
   the 2.3.3 Capacitor build refuse to open on some phones.
8. **Saving an address returns to the screen it was opened from.** The web
   screen always navigates to Profile afterwards, so adding an address in the
   middle of checkout dropped the customer out of it.
9. **The first payment method added is marked primary.** The web app leaves
   `isPrimary` unset until the customer taps "set primary", which strands them
   at "Please set a primary payment method" right after adding their only one.
10. **Admin-chosen brand typography is not applied.** `brandFonts.ts` reads
   `brandHeadingFont` / `brandBodyFont` off `/api/order-charges` and re-skins
   the app from Google Fonts; this app ships Montserrat and Manrope, which are
   what those fields default to. Following them would mean downloading a font
   at startup, so it is left out until someone actually changes them.

## The one thing that cannot be avoided

**Every customer will be signed out by this update.** The Capacitor build kept
the session in the WebView's `localStorage`, which a Flutter build cannot read.
Signing in again is one OTP, but it will generate support calls, so tell people
before rolling out — and roll out in stages (10% first) so it can be halted.
