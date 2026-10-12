import 'package:flutter/material.dart';

import '../theme/brand.dart';

/// The header every screen in the Captain app puts at the top:
///
/// ```html
/// <header className="sticky top-0 bg-white shadow-sm">
///   <div className="flex items-center justify-between px-4 py-3">
///     <Link className="text-2xl leading-none text-black">←</Link>
///     <h2 className="text-lg font-semibold text-black">Title</h2>
///     <span className="w-6" />
/// ```
///
/// White, a faint shadow, 16px of side padding and 12px above and below. The
/// arrow is an actual "←" at 24px, not a Material chevron, because that is what
/// the shipped app draws.
class AppHeader extends StatelessWidget implements PreferredSizeWidget {
  const AppHeader({
    super.key,
    required this.title,
    this.onBack,
    this.showBack = true,
    this.trailing,
  });

  final String title;
  final VoidCallback? onBack;
  final bool showBack;
  final Widget? trailing;

  // py-3 (12 + 12) around a 24px line.
  @override
  Size get preferredSize => const Size.fromHeight(48);

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Brand.surface,
      elevation: 1,
      shadowColor: Colors.black12,
      child: SafeArea(
        bottom: false,
        child: SizedBox(
          height: 48,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                SizedBox(
                  width: 24,
                  child: showBack
                      ? InkWell(
                          onTap:
                              onBack ?? () => Navigator.of(context).maybePop(),
                          child: const Text(
                            '←',
                            style: TextStyle(
                              fontSize: 24,
                              height: 1,
                              color: Colors.black,
                            ),
                          ),
                        )
                      : null,
                ),
                Expanded(
                  child: Text(
                    title,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontFamily: Brand.heading,
                      // text-lg says 18, but globals.css sets `h2 { font-size:
                      // 14px }` outside any cascade layer, which beats every
                      // Tailwind utility. See theme/brand.dart.
                      fontSize: Brand.h2,
                      fontWeight: FontWeight.w600,
                      color: Colors.black,
                    ),
                  ),
                ),
                // Wide enough for a word, not just the 24px the back arrow
                // needs -- "Save" was wrapping onto a second line.
                SizedBox(
                  width: trailing == null ? 24 : 64,
                  child: trailing,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Centres a page the way the shipped app ends up centring one.
///
/// Every page sits inside `div.safe-area`, which carries
/// `padding-top: env(safe-area-inset-top)`, and the centred pages then ask for
/// `h-screen` or `min-h-screen` -- a full **100vh**, measured against the whole
/// window and not against what is left under the status bar. So the box the
/// content is centred in starts below the status bar and is still a whole
/// screen tall: it hangs off the bottom of the display, and `overflow-hidden`
/// (or simply the end of the page) hides the overhang.
///
/// The visible result is that everything sits roughly 36dp lower than a plain
/// `SafeArea` + `Center` puts it. That is small enough to look like nothing and
/// large enough to be the first thing you notice with the two apps side by
/// side, so it is reproduced here rather than tidied up.
///
/// [above] is whatever shares that box above this one -- the sticky header,
/// on the screens that have one.
class WebCentre extends StatelessWidget {
  const WebCentre({
    super.key,
    required this.child,
    this.above = 0,
    this.belowStatusBar = true,
  });

  final double above;

  /// Whether the box starts under the status bar.
  ///
  /// It does on `h-screen` pages, which are pinned where `.safe-area`'s
  /// padding puts them. The `min-h-screen` ones overhang the page by the same
  /// amount and come to rest scrolled past it, so they end up a status bar
  /// higher -- about 48dp, which is plainly visible with the two apps side by
  /// side. Measured, not reasoned: congrats and not-available want false.
  final bool belowStatusBar;

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final screen = MediaQuery.sizeOf(context).height;
    // A whole 100vh, so the box runs off the bottom of the display -- the
    // ClipRect is the `overflow-hidden`.
    final box = screen - above;

    return ClipRect(
      child: LayoutBuilder(
        builder: (context, constraints) {
          // Everything in this app is already inside the app-level SafeArea,
          // so this body starts a status bar down the screen. That is where an
          // `h-screen` page's box begins; a `min-h-screen` one begins at the
          // very top instead.
          final statusBar = screen - constraints.maxHeight - above;
          return Transform.translate(
            offset: Offset(0, belowStatusBar ? 0 : -statusBar),
            child: OverflowBox(
              alignment: Alignment.topCenter,
              minHeight: box,
              maxHeight: box,
              child: Center(child: child),
            ),
          );
        },
      ),
    );
  }
}

/// The full-width gradient button the whole app is built out of.
///
/// Disabled here is a flat `#9ca3af`, which is what every screen writes
/// inline. (The customer app keeps the gradient at half opacity instead -- do
/// not copy that across.)
class GradientButton extends StatelessWidget {
  const GradientButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.height = 48,
    this.radius = Brand.rXl,
    this.fontSize = Brand.buttonText,
    this.fontFamily = Brand.heading,
    this.busy = false,
    this.icon,
  });

  final String label;
  final VoidCallback? onPressed;
  final double height;
  final double radius;
  final double fontSize;

  /// Montserrat by default, because globals.css puts it on every `<button>`.
  /// The handful of these that are really an `<a>` or a `<Link>` pass the body
  /// font instead.
  final String fontFamily;
  final bool busy;
  final Widget? icon;

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null && !busy;
    return SizedBox(
      height: height,
      width: double.infinity,
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(radius),
        child: InkWell(
          borderRadius: BorderRadius.circular(radius),
          onTap: enabled ? onPressed : null,
          child: Ink(
            decoration: BoxDecoration(
              gradient: enabled ? Brand.gradient : null,
              color: enabled ? null : Brand.disabled,
              borderRadius: BorderRadius.circular(radius),
            ),
            child: Center(
              child: busy
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation(Colors.white),
                      ),
                    )
                  : Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (icon != null) ...[icon!, const SizedBox(width: 8)],
                        Text(
                          label,
                          style: TextStyle(
                            fontFamily: fontFamily,
                            fontSize: fontSize,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Text painted with the brand gradient, the way the welcome screen does it
/// with `background-clip: text`.
class GradientText extends StatelessWidget {
  const GradientText(this.text, {super.key, required this.style, this.align});

  final String text;
  final TextStyle style;
  final TextAlign? align;

  @override
  Widget build(BuildContext context) {
    return ShaderMask(
      shaderCallback: (bounds) => Brand.gradient.createShader(
        Rect.fromLTWH(0, 0, bounds.width, bounds.height),
      ),
      blendMode: BlendMode.srcIn,
      child: Text(
        text,
        textAlign: align,
        style: style.copyWith(color: Colors.white),
      ),
    );
  }
}

/// `components/Toast.tsx`: a bar pinned near the top, not Material's bottom
/// snackbar. Four kinds, and the neutral one is the brand gradient.
enum ToastKind { success, error, warning, info }

void showToast(BuildContext context, String message,
    {ToastKind kind = ToastKind.info}) {
  final messenger = ScaffoldMessenger.of(context);
  messenger.clearSnackBars();

  const icons = {
    ToastKind.success: '✓',
    ToastKind.error: '✕',
    ToastKind.warning: '⚠',
    ToastKind.info: 'ℹ',
  };
  const colors = {
    ToastKind.success: Brand.green600,
    ToastKind.error: Brand.red600,
    ToastKind.warning: Brand.yellow600,
    ToastKind.info: null,
  };
  final background = colors[kind];

  messenger.showSnackBar(
    SnackBar(
      duration: const Duration(seconds: 3),
      behavior: SnackBarBehavior.floating,
      backgroundColor: Colors.transparent,
      elevation: 0,
      padding: EdgeInsets.zero,
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      content: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: background,
          gradient: background == null ? Brand.gradient : null,
          borderRadius: BorderRadius.circular(Brand.rXl),
          boxShadow: const [
            BoxShadow(
                color: Color(0x33000000), blurRadius: 12, offset: Offset(0, 4)),
          ],
        ),
        child: Row(
          children: [
            Text(icons[kind]!,
                style: const TextStyle(fontSize: 20, color: Colors.white)),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(
                  fontSize: 14,
                  height: Brand.leadSm,
                  fontWeight: FontWeight.w500,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

/// `components/ConfirmModal.tsx`. Returns true when confirmed.
Future<bool> confirmModal(
  BuildContext context, {
  required String title,
  required String message,
  String confirmText = 'Confirm',
  String cancelText = 'Cancel',
}) async {
  final answer = await showDialog<bool>(
    context: context,
    barrierColor: Colors.black54,
    builder: (context) => Dialog(
      backgroundColor: Brand.surface,
      insetPadding: const EdgeInsets.all(16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(Brand.rXl),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              title,
              style: const TextStyle(
                fontFamily: Brand.heading,
                fontSize: Brand.h3, // <h3>: 14/500, whatever the class says
                fontWeight: FontWeight.w500,
                color: Colors.black,
              ),
            ),
          ),
          const Divider(height: 1, color: Brand.gray200),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              message,
              style: const TextStyle(
                  fontSize: 14, height: Brand.leadSm, color: Brand.gray700),
            ),
          ),
          const Divider(height: 1, color: Brand.gray200),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 38, // py-2.5 around a button's 12px line
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(false),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Brand.gray300, width: 2),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(Brand.rLg),
                        ),
                      ),
                      child: Text(
                        cancelText,
                        style: const TextStyle(
                          fontFamily: Brand.heading,
                          fontSize: Brand.buttonText,
                          fontWeight: FontWeight.w600,
                          color: Brand.gray700,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: GradientButton(
                    label: confirmText,
                    height: 38, // py-2.5
                    radius: Brand.rLg,
                    onPressed: () => Navigator.of(context).pop(true),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
  return answer ?? false;
}

/// Rupees the way the app writes them: a symbol and a whole number.
String rupees(Object? value) {
  final amount =
      value is num ? value : num.tryParse(value?.toString() ?? '') ?? 0;
  return '₹${amount.round()}';
}

/// `border-dashed` has no Flutter equivalent, so it is drawn.
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
      Rect.fromLTWH(strokeWidth / 2, strokeWidth / 2, size.width - strokeWidth,
          size.height - strokeWidth),
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
