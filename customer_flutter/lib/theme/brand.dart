import 'package:flutter/material.dart';

/// The design system, taken value for value from the web app.
///
/// The colours are the HSL custom properties in `customer/src/index.css`
/// converted to hex; the radii are what `tailwind.config.ts` actually produces,
/// which is not the stock Tailwind scale -- shadcn redefines lg/md/sm from
/// `--radius: 1rem`, so `rounded-lg` (16) is larger than `rounded-xl` (12).
class Brand {
  // ---- brand marks -------------------------------------------------------

  /// linear-gradient(to right, #452D9B, #07C8D0)
  static const purple = Color(0xFF452D9B);
  static const cyan = Color(0xFF07C8D0);

  static const LinearGradient gradient = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [purple, cyan],
  );

  /// The darker diagonal behind the wallet plan cards.
  static const LinearGradient deepGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF0F0228), Color(0xFF2D1875), Color(0xFF06869A)],
  );

  // ---- design tokens (index.css :root) -----------------------------------

  /// --background: 0 0% 100%
  static const background = Color(0xFFFFFFFF);

  /// --foreground: 0 0% 0% -- pure black, not a slate grey.
  static const foreground = Color(0xFF000000);

  /// --primary: 210 100% 50% -- a bright blue. This is what `text-primary`
  /// paints, and it is NOT the brand purple.
  static const primary = Color(0xFF0080FF);

  /// --secondary: 210 100% 97%
  static const secondary = Color(0xFFF0F7FF);

  /// --muted: 0 0% 96%
  static const muted = Color(0xFFF5F5F5);

  /// --muted-foreground: 0 0% 45%
  static const mutedForeground = Color(0xFF737373);

  /// --border: 214.3 31.8% 91.4%
  static const border = Color(0xFFE2E8F0);

  /// --input: 220 13% 91%
  static const input = Color(0xFFE5E7EB);

  /// --destructive: 0 84.2% 60.2%
  static const destructive = Color(0xFFEF4444);

  // ---- Tailwind palette entries the screens name directly ----------------

  static const gray50 = Color(0xFFF9FAFB);
  static const gray100 = Color(0xFFF3F4F6);
  static const gray200 = Color(0xFFE5E7EB);
  static const gray300 = Color(0xFFD1D5DB);
  static const gray400 = Color(0xFF9CA3AF);
  static const gray500 = Color(0xFF6B7280);
  static const gray600 = Color(0xFF4B5563);
  static const gray700 = Color(0xFF374151);
  static const gray800 = Color(0xFF1F2937);
  static const gray900 = Color(0xFF111827);

  static const blue50 = Color(0xFFEFF6FF);
  static const blue100 = Color(0xFFDBEAFE);
  static const blue500 = Color(0xFF3B82F6);
  static const blue600 = Color(0xFF2563EB);
  static const blue700 = Color(0xFF1D4ED8);

  static const green500 = Color(0xFF22C55E);
  static const green600 = Color(0xFF16A34A);
  static const green700 = Color(0xFF15803D);
  static const red500 = Color(0xFFEF4444);
  static const red600 = Color(0xFFDC2626);
  static const amber500 = Color(0xFFF59E0B);

  /// Buttons go flat grey where a screen says so (`background: '#9ca3af'`).
  static const disabled = Color(0xFF9CA3AF);

  // ---- radii -------------------------------------------------------------

  /// `rounded-sm` = calc(--radius - 4px)
  static const rSm = 12.0;

  /// `rounded-md` = calc(--radius - 2px)
  static const rMd = 14.0;

  /// `rounded-lg` = --radius. Bigger than `rounded-xl`; that is not a typo.
  static const rLg = 16.0;

  /// `rounded-xl` -- stock Tailwind, not redefined.
  static const rXl = 12.0;

  /// `rounded-2xl` -- stock Tailwind.
  static const r2xl = 16.0;

  /// `rounded-3xl` -- stock Tailwind.
  static const r3xl = 24.0;

  // ---- type --------------------------------------------------------------

  /// Headings and buttons are Montserrat; everything else is Manrope.
  static const heading = 'Montserrat';
  static const body = 'Manrope';

  static ThemeData theme() {
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primary,
        primary: primary,
        secondary: cyan,
      ),
      scaffoldBackgroundColor: background,
      fontFamily: body,
    );

    return base.copyWith(
      textTheme: base.textTheme.apply(
        bodyColor: foreground,
        displayColor: foreground,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: background,
        foregroundColor: foreground,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
      ),
      // The web app's inputs are a 1px --input border at `rounded-md`, with the
      // focus ring in --ring. Screens that want the blue 2px box say so.
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: background,
        hintStyle: const TextStyle(color: mutedForeground),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(rMd),
          borderSide: const BorderSide(color: input),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(rMd),
          borderSide: const BorderSide(color: input),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(rMd),
          borderSide: const BorderSide(color: primary, width: 2),
        ),
      ),
    );
  }
}
