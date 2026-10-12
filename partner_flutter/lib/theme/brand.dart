import 'package:flutter/material.dart';

/// The Captain app's design tokens, read off `partner/src/app/globals.css` and
/// the Tailwind classes the screens actually use.
///
/// One thing to keep in mind when porting a screen across from the customer
/// app: this app has **no shadcn**. `globals.css` is a bare
/// `@import "tailwindcss"`, so the radius scale is stock Tailwind --
/// `rounded-lg` is 8, `rounded-xl` is 12, `rounded-2xl` is 16, in that order.
/// The customer app redefines them from `--radius`, where lg comes out *larger*
/// than xl. Copying a number across without checking gets it wrong.
class Brand {
  Brand._();

  // The brand gradient, written out in dozens of screens as
  // `linear-gradient(to right, #452D9B, #07C8D0)`.
  static const purple = Color(0xFF452D9B);
  static const cyan = Color(0xFF07C8D0);
  static const gradient = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [purple, cyan],
  );

  /// What a disabled gradient button turns into here: a flat grey, not the
  /// customer app's half-opacity gradient. Every screen writes `#9ca3af`.
  static const disabled = Color(0xFF9CA3AF);

  // globals.css: the page sits on gray-50, cards are white.
  static const background = Color(0xFFF9FAFB);
  static const surface = Color(0xFFFFFFFF);

  /// `--foreground: #171717`. Not pure black -- the customer app's is.
  static const foreground = Color(0xFF171717);

  // The Tailwind palette, as **v4** defines it.
  //
  // v4 moved the default colours to OKLCH, and the mid and dark shades came
  // out different from the v3 hexes everyone has memorised: gray-500 is
  // #6a7282, not #6b7280; red-600 is #e7000b, not #dc2626; green-600 is
  // #00a63e, not #16a34a. Reading a Tailwind v3 cheat sheet puts a visibly
  // wrong red on the Logout button. These are converted from
  // `partner/node_modules/tailwindcss/theme.css`.
  //
  // Colours the markup writes as inline hex -- the brand purple and cyan,
  // `#9ca3af` on a disabled button, `#fef3c7` behind an Express chip -- are
  // exact and are **not** part of this palette.
  static const gray50 = Color(0xFFF9FAFB);
  static const gray100 = Color(0xFFF3F4F6);
  static const gray200 = Color(0xFFE5E7EB);
  static const gray300 = Color(0xFFD1D5DC);
  static const gray400 = Color(0xFF99A1AF);
  static const gray500 = Color(0xFF6A7282);
  static const gray600 = Color(0xFF4A5565);
  static const gray700 = Color(0xFF364153);
  static const gray800 = Color(0xFF1E2939);
  static const gray900 = Color(0xFF101828);

  static const red100 = Color(0xFFFFE2E2);
  static const red500 = Color(0xFFFB2C36);
  static const red600 = Color(0xFFE7000B);
  static const red700 = Color(0xFFC10007);
  static const red800 = Color(0xFF9F0712);

  static const green50 = Color(0xFFF0FDF4);
  static const green100 = Color(0xFFDCFCE7);
  static const green200 = Color(0xFFB9F8CF);
  static const green600 = Color(0xFF00A63E);
  static const green800 = Color(0xFF016630);

  static const yellow50 = Color(0xFFFEFCE8);
  static const yellow100 = Color(0xFFFEF9C2);
  static const yellow200 = Color(0xFFFFF085);
  static const yellow600 = Color(0xFFD08700);
  static const yellow700 = Color(0xFFA65F00);
  static const yellow800 = Color(0xFF894B00);

  static const blue50 = Color(0xFFEFF6FF);
  static const blue200 = Color(0xFFBEDBFF);
  static const blue600 = Color(0xFF155DFC);
  static const blue800 = Color(0xFF193CB8);

  /// The login field's idle border, written as `#b8a7d9`.
  static const inputBorder = Color(0xFFB8A7D9);

  // Stock Tailwind radii.
  static const rLg = 8.0;
  static const rXl = 12.0;
  static const r2xl = 16.0;
  static const r3xl = 24.0;

  /// globals.css puts Montserrat on headings and buttons, Manrope on body text.
  static const heading = 'Montserrat';
  static const body = 'Manrope';

  // ---------------------------------------------------------------------
  // Heading and button sizes -- read these before changing any font size.
  //
  // `globals.css` ends with plain element rules:
  //
  //     h1 { font-size: 16px; font-weight: 700 }
  //     h2 { font-size: 14px; font-weight: 600 }
  //     h3 { font-size: 14px; font-weight: 500 }
  //     h4 { font-size: 13px; font-weight: 400 }
  //     button { font-size: 12px }
  //
  // They sit **outside** any cascade layer, and this app is on Tailwind v4,
  // where `@import "tailwindcss"` puts every utility inside `@layer
  // utilities`. An unlayered rule beats a layered one whatever its
  // specificity, so these win over the `text-lg`, `text-2xl`, `text-3xl`
  // classes the markup is full of. `<h1 class="text-3xl font-bold">
  // Congratulations!</h1>` renders at 16px, not 30.
  //
  // So the class on a heading says nothing about its size: only the tag does.
  // Match the tag, not the class. (The **customer** app has the same five
  // rules but inside `@layer base`, where the utilities do win -- do not carry
  // this across.)
  //
  // An inline `style={{ fontSize }}` still wins over all of it. The only place
  // that happens is the splash screen.
  static const h1 = 16.0;
  static const h2 = 14.0;
  static const h3 = 14.0;
  static const h4 = 13.0;
  static const buttonText = 12.0;

  /// Tailwind's preflight puts `line-height: 1.5` on `html`, so every piece of
  /// text in the app that does not name its own `leading-*` sits in a box one
  /// and a half times its font size. Flutter's default is whatever the font
  /// says, which for Manrope is nearer 1.3 -- about 4dp a line. It does not
  /// look like anything on one line and it is 12dp by the third paragraph,
  /// which is enough to walk a screen out of alignment.
  static const lineHeight = 1.5;

  /// Tailwind v4 writes each `text-*` size's line height as a **ratio** of the
  /// font size, not a fixed length -- which is why a `<button class="text-lg">`
  /// capped at 12px gets an 18.7px line box rather than 28. These are those
  /// ratios. Body text that names its size needs the matching one, or a
  /// two-line block comes out 2-4dp tall and a card drifts down the screen.
  static const leadXs = 4 / 3; // text-xs   12 -> 16
  static const leadSm = 10 / 7; // text-sm   14 -> 20
  static const leadBase = 1.5; // text-base 16 -> 24
  static const leadLg = 14 / 9; // text-lg   18 -> 28
  static const leadXl = 1.4; // text-xl   20 -> 28
  static const lead2xl = 4 / 3; // text-2xl  24 -> 32

  static ThemeData theme() {
    final base = ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: background,
      fontFamily: body,
      colorScheme: ColorScheme.fromSeed(
        seedColor: purple,
        primary: purple,
        surface: surface,
      ),
      splashFactory: InkRipple.splashFactory,
      appBarTheme: const AppBarTheme(
        backgroundColor: surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
      ),
    );

    // `bodyMedium` is what Material hands to every bare Text, and a Text's own
    // style is merged over it, so this reaches anything that does not set its
    // own height or spacing.
    return base.copyWith(textTheme: _webMetrics(base.textTheme));
  }

  /// Material's own text styles carry a letter-spacing -- 0.25 on bodyMedium,
  /// 0.1 on labelLarge, and so on -- and Flutter merges it into every Text
  /// that does not override it. CSS has none: `letter-spacing: normal` is
  /// zero. On a sixteen-character chip that is four device-independent pixels,
  /// four per cent, and it is the difference between "Express Delivery"
  /// fitting beside the address and pushing the SLA line onto a second row.
  ///
  /// The line height goes on here too, for the same reason: see [lineHeight].
  static TextTheme _webMetrics(TextTheme t) {
    TextStyle? body(TextStyle? s) =>
        s?.copyWith(letterSpacing: 0, height: lineHeight);
    TextStyle? flat(TextStyle? s) => s?.copyWith(letterSpacing: 0);

    return TextTheme(
      displayLarge: flat(t.displayLarge),
      displayMedium: flat(t.displayMedium),
      displaySmall: flat(t.displaySmall),
      headlineLarge: flat(t.headlineLarge),
      headlineMedium: flat(t.headlineMedium),
      headlineSmall: flat(t.headlineSmall),
      titleLarge: flat(t.titleLarge),
      titleMedium: flat(t.titleMedium),
      titleSmall: flat(t.titleSmall),
      bodyLarge: body(t.bodyLarge),
      bodyMedium: body(t.bodyMedium),
      bodySmall: body(t.bodySmall),
      labelLarge: flat(t.labelLarge),
      labelMedium: flat(t.labelMedium),
      labelSmall: flat(t.labelSmall),
    );
  }
}
