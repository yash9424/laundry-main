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
                      fontSize: 18, // text-lg
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
    this.fontSize = 16,
    this.busy = false,
    this.icon,
  });

  final String label;
  final VoidCallback? onPressed;
  final double height;
  final double radius;
  final double fontSize;
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
                            fontFamily: Brand.heading,
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
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: Colors.black,
              ),
            ),
          ),
          const Divider(height: 1, color: Brand.gray200),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              message,
              style: const TextStyle(fontSize: 14, color: Brand.gray700),
            ),
          ),
          const Divider(height: 1, color: Brand.gray200),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 42, // py-2.5
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
                    height: 42,
                    radius: Brand.rLg,
                    fontSize: 14,
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
