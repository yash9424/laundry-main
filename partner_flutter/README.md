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
screen, with every pair of screenshots compared block by block rather than by
eye. Three things that are invisible one app at a time and obvious side by
side:

- **This app has no shadcn.** `partner/src/app/globals.css` is a bare
  `@import "tailwindcss"`, so the radius scale is stock Tailwind and ascends:
  `rounded-lg` 8, `rounded-xl` 12, `rounded-2xl` 16. The **customer** app
  redefines them from `--radius`, where `lg` comes out *larger* than `xl`.
  Copying a widget across from `customer_flutter` without checking gets this
  wrong, and it is invisible until someone compares screenshots.
- A disabled button here is a **flat `#9ca3af`**, written inline on every
  screen. The customer app keeps the gradient at half opacity instead.
- The page sits on `#f9fafb`, not white, and `--foreground` is `#171717`.

### The one that changes every screen: nothing is the size its class says

`partner/src/app/globals.css` ends with five plain element rules:

```css
h1 { font-size: 16px; font-weight: 700 }
h2 { font-size: 14px; font-weight: 600 }
h3 { font-size: 14px; font-weight: 500 }
h4 { font-size: 13px; font-weight: 400 }
button { font-size: 12px }
```

They sit **outside any cascade layer**, and this app is on Tailwind v4, where
`@import "tailwindcss"` puts every utility inside `@layer utilities`. An
unlayered rule beats a layered one whatever its specificity, so these win over
the `text-lg`, `text-xl`, `text-2xl`, `text-3xl` classes the markup is full of.
`<h1 class="text-3xl font-bold">Congratulations!</h1>` renders at **16px**.
Every button label in the app renders at **12px**, whatever it asks for -- no
button anywhere sets an inline `fontSize`, which is the only thing that would
win. Only the weight still comes from the utilities on a button; on a heading
the element rule sets that too.

So on this app **the class on a heading or a button says nothing about its
size -- only the tag does.** Reading the sizes off the classes, which is the
obvious thing to do, makes every title and every button about a third too
large, and every button too tall with it. `lib/theme/brand.dart` carries the
five values as `Brand.h1`…`Brand.buttonText` with the same warning.

A button's height follows from the same thing: Tailwind v4 writes its
line-heights as ratios, so `py-3 text-base` is `24 + 1.5x12 = 42dp`, not 48.
Measured against the shipped APK, `py-4 text-lg` comes out at 50.7dp and this
port now says 51.

The **customer** app has the same five rules, but inside `@layer base`, where
the utilities do win. Do not carry this across.

### The second one that changes every screen: letter spacing

Material's own text styles carry a letter-spacing -- 0.25 on `bodyMedium`, 0.1
on `labelLarge` -- and Flutter merges it into every `Text` that does not
override it. CSS has none; `letter-spacing: normal` is zero. It is four per
cent on a sixteen-character chip, which sounds like nothing and is the
difference between "Express Delivery" fitting beside the address and shoving
the SLA line onto a second row. `Brand.theme()` zeroes it across the whole
text theme, and the same place gives body text the `line-height: 1.5` that
Tailwind's preflight puts on `html`. Before that change the Captain's pickup
list was a whole card-height out by the second order.

### The Tailwind palette moved

v4 defines its colours in OKLCH, and the mid and dark shades came out
different from the v3 hexes that are in everyone's muscle memory: `red-600` is
`#e7000b`, not `#dc2626`; `green-600` is `#00a63e`, not `#16a34a`; `gray-500`
is `#6a7282`, not `#6b7280`. The Logout button was visibly the wrong red.
`lib/theme/brand.dart` carries the v4 values, converted from
`partner/node_modules/tailwindcss/theme.css`. Colours the markup writes as
inline hex are exact and are not part of that palette.

v4 also **dropped `bg-opacity-*`**, so `className="bg-white bg-opacity-25"` --
which both the green and the amber banners use for the circle behind their
emoji -- does nothing at all, and the circle is solid white.

### Pages sit lower than they look like they should

Every page is inside `div.safe-area`, which carries
`padding-top: env(safe-area-inset-top)`, and the centred pages then ask for
`h-screen`/`min-h-screen` -- a whole 100vh, measured against the window, not
against what is left below the status bar. The box the content is centred in
therefore starts below the status bar and is still a full screen tall: it hangs
off the bottom, and the overhang is clipped. Everything on those pages ends up
about **48dp lower** than `SafeArea` + `Center` puts it. `WebCentre` in
`lib/widgets/common.dart` reproduces it.

The `min-h-screen` ones -- congrats and not-available -- overhang by the same
amount but come to rest scrolled past it, so they sit a status bar *higher*
than the `h-screen` ones. `WebCentre` takes `belowStatusBar: false` for those.
Both numbers were measured off the shipped APK, not reasoned about.

### Pictures are not the size the markup asks for

Tailwind's preflight puts `height: auto` on every `<img>`, so `<Image
width={288} height={288}>` over a 412x392 asset draws **288 x 274**, and the
declared height is thrown away. The two "SVG" illustrations are worse: each is
a square 1024 raster stretched into a differently-shaped `<pattern>` box, so
`scooter.svg` draws 220 x 235 with the sides cropped and `Delivery.svg` draws
220 x 189 with the top and bottom cropped. Each one is commented where it is
used.

And a Flutter trap in the same family: a `Column` with
`CrossAxisAlignment.stretch` hands its children a *tight* width, which
silently overrides `Image.asset(width: 288)`. The congrats illustration was a
third too big until that column went back to `center`.

### Things only running it caught

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
- **Every pickup dated after 18:30 showed the wrong day.** `DateTime.parse`
  keeps an ISO string in UTC and `.day` then answers in UTC, while the web app
  does the same arithmetic in JavaScript, where `Date` is always local. Five
  and a half hours is enough to move the date. Everything that parses a date
  goes through `lib/utils/dates.dart` now.
- **The bottom bar was missing from eight screens.** `ClientBottomNav` hides it
  on seven named paths and nowhere else, so it is there on pickup start and
  confirm, delivery details, hub delivered, notifications and all three profile
  sub-pages. `/notifications` matches none of its path tests, so the bar is
  drawn there with nothing highlighted -- `NavTab.none`.

---

## What the call-by-call audit against the shipped app caught

Every backend call the shipped app makes was put beside this one's -- method,
path, query, body field names -- and the order lifecycle came out identical:
every status string, every timestamp key, every flag. Seven things did not.

- **A failed hub lookup erased the order's hub.** Both apps send
  `hub: <the hub or nothing>` when a bag is dropped, but `JSON.stringify` omits
  an undefined value while `jsonEncode` writes `"hub": null` -- and the route
  `$set`s whatever it is given. One flaky `GET /api/hubs` and the order lost
  the hub it was assigned when it was placed, which is what the hub's own order
  list filters on. The key is now sent only when there is a hub.
- **"Delivered to Hub" emptied itself.** It filtered on the status being
  `delivered_to_hub`; the web screen tests for `deliveredToHubAt` being set.
  The status moves on as the hub works through the bag, so the captain's record
  of a handover disappeared within the hour.
- **Every admin broadcast was dated "now".** The route renames `sentAt` to
  `timestamp` on the way out; this read the stored name, found nothing, and
  fell back to the current time -- which also sorted old messages above today's.
- **Reading or deleting a broadcast did not stick.** Those come back from the
  server on every load with no per-captain state, so the web app keeps the ids
  in `partner_read_notifications` / `partner_deleted_notifications`. Both keys
  are kept here now, and cleared on sign-out.
- **Saving Personal Details dropped `address.pincode`.** The web screen
  re-derives it from the first service pincode on every save, and two screens
  read it: the hub a drop-off is matched to, and the pincodes a delivery is
  offered for.
- **The bottom bar showed while KYC was still pending.** `ClientBottomNav`
  hides it until `kycStatus` is `approved`, and this screen is only ever shown
  before that.
- **A notification tap always opened the pickup list**, although the payload
  names the screen -- the delivery list for an order ready to go out.

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
- **A rejected captain tapping the Delivery tab goes straight to the KYC
  status screen.** The web screen sends them to `/profile/kyc` instead, which
  immediately bounces them here anyway (see the bounce below), so this skips a
  screen that only flashes.
- **Admin-chosen brand typography is not applied.** `BrandFonts.tsx` reads
  `brandHeadingFont` / `brandBodyFont` off `/api/order-charges` and loads them
  from Google Fonts; this app ships Montserrat and Manrope, which are the
  defaults those fields hold. Following them would mean downloading a font at
  startup, so it is left out until someone actually changes them.

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
