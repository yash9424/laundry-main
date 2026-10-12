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

  // The Tailwind greys the screens name directly.
  static const gray50 = Color(0xFFF9FAFB);
  static const gray100 = Color(0xFFF3F4F6);
  static const gray200 = Color(0xFFE5E7EB);
  static const gray300 = Color(0xFFD1D5DB);
  static const gray400 = Color(0xFF9CA3AF);
  static const gray500 = Color(0xFF6B7280);
  static const gray600 = Color(0xFF4B5563);
  static const gray700 = Color(0xFF374151);
  static const gray900 = Color(0xFF111827);

  static const green600 = Color(0xFF16A34A);
  static const red600 = Color(0xFFDC2626);
  static const red500 = Color(0xFFEF4444);
  static const yellow600 = Color(0xFFCA8A04);
  static const blue600 = Color(0xFF2563EB);

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

  static ThemeData theme() {
    return ThemeData(
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
  }
}
