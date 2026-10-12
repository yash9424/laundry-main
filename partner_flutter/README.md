# Urban Steam Captain — Flutter

A Flutter rewrite of `partner/`, the Capacitor app the delivery captains use.
It is built to go out as an **update to the published app**, not as a new
listing, so its identity has to match what is already on the Play Store.

---

## Identity — do not change any of this

| | Value | Why it matters |
|---|---|---|
| Android `applicationId` | `com.urbansteam.partner` | What the published app is listed under. Change it and this becomes a different app rather than an update. |
| Android `namespace` | `com.urbansteam.partner` | Must match the package `MainActivity.kt` declares, or the app installs and then crashes with `ClassNotFoundException` on launch. |
| Signing key | `partner/partner-release-key-new.keystore`, alias `partner-key` | Play rejects an update signed with anything else, and the key for a published app cannot be rotated. Verified: this build's signer digest is identical to the shipped 1.0.17 APK. |
| `versionCode` / `versionName` | `18` / `1.1.0` | The shipped Capacitor build is 17 / 1.0.17. Play needs a higher code. |
| App label | `Urban Steam Captain` | What the launcher shows. |
| `minSdk` | 24 | Flutter's floor. The Capacitor build declares 23, so captains on Android 6.0 keep what they have and stop getting updates. |
| `compileSdk` / `targetSdk` | 36 / 35 | `androidx.navigationevent` refuses to compile below 36. targetSdk stays at 35, which is what the Capacitor build declares. |

`android/key.properties` holds the keystore password and is **not** in git.
It needs to exist before a release build:

```properties
storePassword=...
keyPassword=...
keyAlias=partner-key
storeFile=../../../partner/partner-release-key-new.keystore
```

---

## Build

```bash
cd partner_flutter
flutter pub get
flutter analyze
flutter test
flutter build apk --release
```

Two dart-defines, both optional:

- `--dart-define=API_URL=...` — the backend. Defaults to
  `https://acsgroup.cloud`, so a plain build is shippable.
- `--dart-define=GOOGLE_MAPS_API_KEY=...` — turns on the live navigation map.
  The key is deliberately **not** in this source: the same key is already in
  git twice (CLAUDE.md 8.6) and a third copy spreads it for nothing. Without
  it that one panel falls back to the address and a link out to Google Maps;
  nothing else depends on it.

---

## Layout

```
lib/
  main.dart            app shell, the order monitor's lifecycle, back-button policy
  routes.dart          every screen, under the same path the Next.js app used
  config/api.dart      API_URL and the helper that absolutises /uploads paths
  theme/brand.dart     colours, radii, fonts
  models/order.dart    the parts of an Order this app reads
  services/
    api.dart           every call the app makes, in one place
    store.dart         the four localStorage keys, on shared_preferences
    notifications.dart the order monitor and the stored notification list
  utils/
    map_links.dart     directions and embed URLs, pin-first
    order_breakdown.dart  what an order was made of and what is left to collect
  widgets/             header, buttons, toast, bottom bar, the two maps
  screens/             21 screens, one file each
```

The three `[id]` routes in `partner/src/app` are **not** ported. They are
orphans — the shipped app navigates with query strings — and carrying them
across would bring dead code with it (CLAUDE.md 8.3).

---

## How the look was matched

The shipped 1.0.17 APK was installed next to this one and walked screen by
screen. The thing most likely to be got wrong, and the reason there is a test
for it:

- **This app has no shadcn.** `partner/src/app/globals.css` is a bare
  `@import "tailwindcss"`, so the radius scale is stock Tailwind and ascends:
  `rounded-lg` 8, `rounded-xl` 12, `rounded-2xl` 16. The **customer** app
  redefines them from `--radius`, where `lg` comes out *larger* than `xl`.
  Copying a widget across from `customer_flutter` without checking gets this
  wrong, and it is invisible until someone compares screenshots.
- A disabled button here is a **flat `#9ca3af`**, written inline on every
  screen. The customer app keeps the gradient at half opacity instead.
- The page sits on `#f9fafb`, not white, and `--foreground` is `#171717`.

### Four things only running it caught

- **The bottom bar swallowed the whole screen.** `Center` fills whatever it is
  given, and the `bottomNavigationBar` slot hands it the full height — the bar
  became full-screen and squeezed the page to nothing. It takes
  `heightFactor: 1` now. (Same family of bug as `Container(alignment:)` in the
  customer port.)
- **`scooter.svg` and `Delivery.svg` drew nothing.** Neither is vector art:
  each is a 1 MB raster wrapped in an SVG `<pattern>` behind a drop-shadow
  `<filter>`, which `flutter_svg` does not render. The rasters were extracted
  and are used as PNGs.
- **"Save" in the header wrapped onto two lines**, because the trailing slot
  mirrored the 24 px back arrow.
- **The app installed and crashed instantly** until `MainActivity.kt` was moved
  into the package the `namespace` declares.

---

## What is deliberately different from the web app

Everything else is a faithful port. These are the exceptions:

- **No invented notifications.** When the API returned nothing, the web screen
  filled the list with examples — "New Pickup Available … Order #ORD001",
  "Payment Received … ₹350" — that a captain cannot tell from real ones. An
  empty list says there is nothing.
- **Tapping a notification opens the screen it is about.** The Capacitor build
  registered no listener, so tapping one did nothing.
- **The order monitor follows whoever is signed in.** The web app polled
  localStorage on a timer to achieve this; here sign-in and sign-out push to a
  stream.
- **The pickup pool is the only unfiltered `GET /api/orders`.** Everything else
  asks for this captain's own orders, and the monitor uses `partnerScope`.
- **Aadhaar is masked** to its last four digits on the KYC screen, as on the
  web. (The admin panel still shows it in full — that is a backend screen and
  out of scope here.)

## Carried over on purpose, bugs included

These are in CLAUDE.md 9.3 as known and possibly load-bearing, so the port
reproduces them rather than quietly changing behaviour. Each is commented at
the site:

- **Two captains can claim the same pickup.** The check and the assignment are
  separate unconditioned calls. Fixing it needs a conditional update on the
  server, which the installed apps also depend on.
- **"Drop to Hub" with nothing ticked acts on every order in the list**, and
  the result of each call is not checked, so the success toast appears whether
  or not the server accepted it.
- **A rejected captain cannot replace a document.** "Edit KYC" goes to
  `/profile/kyc`, which sees a status other than `pending` and shows its
  waiting screen instead of the form, then bounces back. Resubmitting the same
  documents is all that works.

---

## The one thing that cannot be avoided

**Shipping this signs every captain out.** The session lives in the WebView's
localStorage, which belongs to the webview and not to the app, so a Flutter
build cannot read it. Every captain will have to sign in again with their
number and an OTP. Roll out in stages.
