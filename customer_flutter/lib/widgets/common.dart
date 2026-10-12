import 'package:flutter/material.dart';

import '../theme/brand.dart';

/// How a gradient button looks when it cannot be pressed.
enum DisabledLook {
  /// The shadcn Button default: `disabled:opacity-50`, so the gradient stays
  /// and simply fades. This is what the login, pincode and slot screens show.
  fadedGradient,

  /// A flat `#9ca3af`, which the profile and cart screens set inline.
  flatGrey,

  /// `bg-gray-300`, which Rate Your Order and the slot screen ask for. The
  /// slot screen also greys the label; Rate Your Order leaves it white, so the
  /// colour is passed separately.
  flatGrey300,
}

/// The gradient button used on nearly every screen.
///
/// Buttons in the web app are Montserrat (index.css sets the heading font on
/// `button`), so the label is too.
class GradientButton extends StatelessWidget {
  const GradientButton({
    super.key,
    required this.label,
    this.onPressed,
    this.height = 48,
    this.radius = Brand.r2xl,
    this.icon,
    this.busy = false,
    this.fontSize = 16,
    this.fontWeight = FontWeight.w600,
    this.disabledLook = DisabledLook.fadedGradient,
    this.disabledLabelColour,
    this.shadow = true,
  });

  final String label;
  final VoidCallback? onPressed;
  final double height;
  final double radius;
  final IconData? icon;
  final bool busy;
  final double fontSize;
  final FontWeight fontWeight;
  final DisabledLook disabledLook;

  /// What the label turns when the button is disabled. White unless a screen
  /// says otherwise -- the slot screen's `bg-gray-300 text-gray-500` does.
  final Color? disabledLabelColour;
  final bool shadow;

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null && !busy;
    final faded = !enabled && disabledLook == DisabledLook.fadedGradient;
    final labelColour = enabled || disabledLabelColour == null
        ? Colors.white
        : disabledLabelColour!;

    final body = SizedBox(
      height: height,
      width: double.infinity,
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: (enabled || faded) ? Brand.gradient : null,
          color: (enabled || faded)
              ? null
              : (disabledLook == DisabledLook.flatGrey300
                    ? const Color(0xFFD1D5DB) // gray-300
                    : Brand.disabled),
          borderRadius: BorderRadius.circular(radius),
          boxShadow: shadow
              ? [
                  BoxShadow(
                    color: Brand.purple.withValues(alpha: 0.25),
                    blurRadius: 14,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null,
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(radius),
          child: InkWell(
            borderRadius: BorderRadius.circular(radius),
            onTap: enabled ? onPressed : null,
            child: Center(
              child: busy
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.2,
                        valueColor: AlwaysStoppedAnimation(Colors.white),
                      ),
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (icon != null) ...[
                          Icon(icon, size: fontSize + 2, color: labelColour),
                          const SizedBox(width: 8),
                        ],
                        Text(
                          label,
                          style: TextStyle(
                            color: labelColour,
                            fontSize: fontSize,
                            fontWeight: fontWeight,
                            fontFamily: Brand.heading,
                          ),
                        ),
                      ],
                    ),
            ),
          ),
        ),
      ),
    );

    // `disabled:opacity-50` fades the whole button, text included.
    return faded ? Opacity(opacity: 0.5, child: body) : body;
  }
}

/// Text painted with the brand gradient, as several headings are.
class GradientText extends StatelessWidget {
  const GradientText(
    this.text, {
    super.key,
    required this.style,
    this.align,
    this.gradient,
  });

  final String text;
  final TextStyle style;
  final TextAlign? align;

  /// The brand gradient unless a screen paints its headings in its own, which
  /// Refer & Earn does -- it is written in Tailwind blues throughout.
  final Gradient? gradient;

  @override
  Widget build(BuildContext context) {
    return ShaderMask(
      shaderCallback: (bounds) => (gradient ?? Brand.gradient).createShader(
        Rect.fromLTWH(0, 0, bounds.width, bounds.height),
      ),
      child: Text(
        text,
        textAlign: align,
        style: style.copyWith(color: Colors.white),
      ),
    );
  }
}

/// The shared Header component (customer/src/components/Header.tsx): a short
/// band with a 36px back target on the left, the title absolutely centred at
/// 0.9rem/600, and an optional 36px action on the right.
class AppHeader extends StatelessWidget implements PreferredSizeWidget {
  const AppHeader({
    super.key,
    required this.title,
    this.gradient = false,
    this.onBack,
    this.backTo = '/home',
    this.action,
  });

  final String title;
  final bool gradient;
  final VoidCallback? onBack;
  final String backTo;
  final Widget? action;

  /// min-height 40 + 0.5rem padding top and bottom.
  static const double bandHeight = 56;

  @override
  Size get preferredSize => const Size.fromHeight(bandHeight);

  void _back(BuildContext context) {
    if (onBack != null) {
      onBack!();
      return;
    }
    final navigator = Navigator.of(context);
    if (navigator.canPop()) {
      navigator.pop();
    } else {
      navigator.pushReplacementNamed(backTo);
    }
  }

  @override
  Widget build(BuildContext context) {
    final onColour = gradient ? Colors.white : Brand.gray600;
    final titleColour = gradient ? Colors.white : Colors.black;

    return Container(
      padding: EdgeInsets.only(top: MediaQuery.of(context).padding.top),
      decoration: BoxDecoration(
        gradient: gradient ? Brand.gradient : null,
        color: gradient ? null : Colors.white,
        border: gradient
            ? null
            : const Border(bottom: BorderSide(color: Brand.border)),
        boxShadow: gradient
            ? [
                BoxShadow(
                  color: Brand.purple.withValues(alpha: 0.25),
                  blurRadius: 18,
                  offset: const Offset(0, 4),
                ),
              ]
            : const [
                BoxShadow(
                  color: Color(0x0D000000),
                  blurRadius: 4,
                  offset: Offset(0, 1),
                ),
              ],
      ),
      child: SizedBox(
        height: bandHeight,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Stack(
            children: [
              Align(
                alignment: Alignment.centerLeft,
                child: _tapTarget(
                  onTap: () => _back(context),
                  child: Icon(Icons.arrow_back, size: 20, color: onColour),
                ),
              ),
              Center(
                child: Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontFamily: Brand.heading,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: titleColour,
                  ),
                ),
              ),
              if (action != null)
                Align(alignment: Alignment.centerRight, child: action!),
            ],
          ),
        ),
      ),
    );
  }

  static Widget _tapTarget({
    required VoidCallback onTap,
    required Widget child,
  }) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onTap,
        child: SizedBox(height: 36, width: 36, child: Center(child: child)),
      ),
    );
  }
}

/// The header the screens that do not use Header.tsx write for themselves:
/// `border-b px-4 py-4` with a 20px back chevron and an 18px bold title.
/// Set [centred] for the pincode screen, which has no back control at all.
class PageHeader extends StatelessWidget implements PreferredSizeWidget {
  const PageHeader(
    this.title, {
    super.key,
    this.onBack,
    this.showBack = true,
    this.centred = false,
    this.subtitle,
    this.actions,
    this.gradient = false,
    this.titleSize = 18,
    this.iconSize = 20,
  });

  final String title;
  final VoidCallback? onBack;
  final bool showBack;
  final bool centred;
  final String? subtitle;
  final List<Widget>? actions;

  /// The legal screens carry a gradient band with a 20px white title.
  final bool gradient;
  final double titleSize;
  final double iconSize;

  @override
  Size get preferredSize => const Size.fromHeight(60);

  @override
  Widget build(BuildContext context) {
    final heading = Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: centred
          ? CrossAxisAlignment.center
          : CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(
            fontFamily: Brand.heading,
            fontSize: titleSize,
            fontWeight: FontWeight.w700,
            color: gradient ? Colors.white : Colors.black,
            height: 1.2,
          ),
        ),
        if (subtitle != null)
          Text(
            subtitle!,
            style: TextStyle(
              fontSize: 11,
              color: gradient ? Colors.white70 : Brand.mutedForeground,
            ),
          ),
      ],
    );

    return Container(
      padding: EdgeInsets.only(top: MediaQuery.of(context).padding.top),
      decoration: BoxDecoration(
        gradient: gradient ? Brand.gradient : null,
        color: gradient ? null : Colors.white,
        border: gradient
            ? null
            : const Border(bottom: BorderSide(color: Brand.border)),
        boxShadow: gradient
            ? [
                BoxShadow(
                  color: Brand.purple.withValues(alpha: 0.3),
                  blurRadius: 18,
                  offset: const Offset(0, 4),
                ),
              ]
            : null,
      ),
      child: SizedBox(
        height: 60,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: centred
              ? Row(
                  children: [Expanded(child: Center(child: heading))],
                )
              : Row(
                  children: [
                    if (showBack)
                      GestureDetector(
                        onTap:
                            onBack ??
                            () {
                              final navigator = Navigator.of(context);
                              if (navigator.canPop()) {
                                navigator.pop();
                              } else {
                                navigator.pushReplacementNamed('/home');
                              }
                            },
                        behavior: HitTestBehavior.opaque,
                        child: SizedBox(
                          width: 32,
                          child: Icon(
                            Icons.arrow_back,
                            size: iconSize,
                            color: gradient ? Colors.white : Colors.black,
                          ),
                        ),
                      ),
                    Expanded(child: heading),
                    if (actions != null) ...actions!,
                  ],
                ),
        ),
      ),
    );
  }
}

/// `border-2 border-dashed`, which Flutter's own borders cannot draw.
class DashedBorderPainter extends CustomPainter {
  const DashedBorderPainter({
    required this.color,
    required this.radius,
    required this.strokeWidth,
  });

  final Color color;
  final double radius;
  final double strokeWidth;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke;

    final rect = RRect.fromRectAndRadius(
      Rect.fromLTWH(
        strokeWidth / 2,
        strokeWidth / 2,
        size.width - strokeWidth,
        size.height - strokeWidth,
      ),
      Radius.circular(radius),
    );

    const dash = 6.0;
    const gap = 4.0;
    for (final metric in (Path()..addRRect(rect)).computeMetrics()) {
      var distance = 0.0;
      while (distance < metric.length) {
        final next = (distance + dash).clamp(0.0, metric.length);
        canvas.drawPath(metric.extractPath(distance, next), paint);
        distance = next + gap;
      }
    }
  }

  @override
  bool shouldRepaint(covariant DashedBorderPainter old) =>
      old.color != color || old.radius != radius;
}

/// The banner the Booking and Add Address screens show in place of an alert:
/// a wide pill pinned near the top of the page, green when something worked
/// and red when it did not.
///
/// `fixed top-4 left-1/2 -translate-x-1/2`, so it returns a [Positioned] and
/// belongs directly inside a [Stack].
class TopToast extends StatelessWidget {
  const TopToast({
    super.key,
    required this.message,
    required this.error,
    required this.onClose,
  });

  final String message;
  final bool error;
  final VoidCallback onClose;

  /// `shadow-2xl`.
  static const _shadow = [
    BoxShadow(color: Color(0x40000000), blurRadius: 50, offset: Offset(0, 25)),
  ];

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: 16, // top-4
      left: 0,
      right: 0,
      child: Center(
        child: Container(
          constraints: const BoxConstraints(minWidth: 300), // min-w-[300px]
          padding: const EdgeInsets.symmetric(
            horizontal: 24,
            vertical: 16,
          ), // px-6 py-4
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: error
                  ? const [Brand.red500, Brand.red600]
                  : const [Brand.green500, Brand.green600],
            ),
            borderRadius: BorderRadius.circular(Brand.r2xl),
            boxShadow: _shadow,
          ),
          child: Row(
            children: [
              const Icon(Icons.error_outline, size: 24, color: Colors.white),
              const SizedBox(width: 12), // gap-3
              Expanded(
                child: Text(
                  message,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              GestureDetector(
                onTap: onClose,
                behavior: HitTestBehavior.opaque,
                child: const Icon(Icons.close, size: 20, color: Colors.white),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// A one-line message, used where the web app called alert().
void showToast(BuildContext context, String message, {bool error = false}) {
  if (!context.mounted) return;
  final messenger = ScaffoldMessenger.maybeOf(context);
  if (messenger == null) return;
  messenger.clearSnackBars();
  messenger.showSnackBar(
    SnackBar(
      content: Text(message),
      backgroundColor: error ? Brand.destructive : Brand.purple,
      behavior: SnackBarBehavior.floating,
      duration: const Duration(seconds: 3),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
  );
}

/// Formats money the way every screen prints it.
String rupees(num amount) => '₹${amount.round()}';

/// SafeArea, plus the extra top inset the web app gives a handful of screens.
///
/// Welcome, Check Availability, Congrats, Not Available, Create Profile and
/// Verify Mobile all carry a `safe-top` class in the web app, which adds
/// `env(safe-area-inset-top)` as padding. The WebView already begins below the
/// status bar, because Capacitor runs with `overlaysWebView: false`, so the
/// inset lands twice and the content sits a status bar lower than it otherwise
/// would. It is a quirk rather than a decision, but it is where customers are
/// used to seeing these screens, so the port matches it.
///
/// `viewPadding` rather than `padding`, because the app-level SafeArea in
/// main.dart has already consumed the latter by the time a screen builds.
class QuirkSafeArea extends StatelessWidget {
  const QuirkSafeArea({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    // Read the inset off the window rather than the inherited MediaQuery: the
    // app-level SafeArea in main.dart has already removed it from both
    // `padding` and `viewPadding` by the time a screen builds, so asking the
    // context would give zero and nothing would move.
    final statusBar = MediaQueryData.fromView(View.of(context)).padding.top;
    return Padding(
      padding: EdgeInsets.only(top: statusBar),
      child: SafeArea(child: child),
    );
  }
}
