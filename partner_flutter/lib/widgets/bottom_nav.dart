import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../theme/brand.dart';

/// Which of the five tabs a screen belongs to.
///
/// `none` is for the screens the web app's path matching does not claim --
/// `/notifications` is the one that reaches it -- where the bar is drawn with
/// nothing highlighted.
enum NavTab { pickup, hub, pickForDelivery, delivery, profile, none }

/// `components/BottomNav.tsx`.
///
/// The web version paints each icon by using the SVG as a CSS mask and filling
/// it with a colour, so the same file serves as a grey icon and as a white one
/// inside a gradient tile. flutter_svg's colour filter does exactly that, so
/// the icons here are the app's own SVGs rather than Material stand-ins.
///
/// `ClientBottomNav` hides the bar before KYC is approved and on the sign-up
/// screens; that decision is made by the screens themselves here, since each
/// one already knows whether it is a work screen.
class PartnerBottomNav extends StatelessWidget {
  const PartnerBottomNav({super.key, required this.current});

  final NavTab current;

  static const _items =
      <({NavTab tab, String label, String asset, String route, bool check})>[
    (
      tab: NavTab.pickup,
      label: 'Pickup',
      asset: 'assets/icons/PickupIcon.svg',
      route: '/pickups',
      check: false
    ),
    (
      tab: NavTab.hub,
      label: 'Reached Hub',
      asset: 'assets/icons/ReachedHubIcon.svg',
      route: '/hub/drop',
      check: false
    ),
    (
      tab: NavTab.pickForDelivery,
      label: 'Pick for Delivery',
      asset: 'assets/icons/PickforDeliveryIcon.svg',
      route: '/delivery/pick',
      check: false
    ),
    (
      tab: NavTab.delivery,
      label: 'Delivery',
      asset: 'assets/icons/DeliveryIcon.svg',
      route: '/delivery/history',
      check: true
    ),
    (
      tab: NavTab.profile,
      label: 'Profile',
      asset: '',
      route: '/profile',
      check: false
    ),
  ];

  void _go(BuildContext context, String route) {
    if (ModalRoute.of(context)?.settings.name == route) return;
    Navigator.of(context).pushNamedAndRemoveUntil(route, (r) => false);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Brand.surface,
        border: Border(top: BorderSide(color: Brand.gray200)),
        boxShadow: [
          BoxShadow(
              color: Color(0x25000000), blurRadius: 25, offset: Offset(0, -8)),
        ],
      ),
      child: SafeArea(
        top: false,
        // heightFactor, because a bare Center fills whatever it is given and
        // the bottomNavigationBar slot will hand it the whole screen -- the bar
        // then became full height and squeezed the page down to nothing.
        child: Center(
          heightFactor: 1,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 448), // max-w-md
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  for (final item in _items)
                    Expanded(
                      child: _NavItem(
                        label: item.label,
                        asset: item.asset,
                        active: item.tab == current,
                        showCheck: item.check,
                        onTap: () => _go(context, item.route),
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

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.label,
    required this.asset,
    required this.active,
    required this.showCheck,
    required this.onTap,
  });

  final String label;
  final String asset;
  final bool active;
  final bool showCheck;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(Brand.rXl),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _icon(),
            const SizedBox(height: 4), // gap-1
            Text(
              label,
              // The web label is a plain span in a grid cell: it wraps rather
              // than truncating, so "Pick for Delivery" takes two lines.
              maxLines: 2,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 10,
                color: active ? Brand.purple : Brand.gray500,
                fontWeight: active ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _icon() {
    final glyph = asset.isEmpty
        ? _profileGlyph(active ? Colors.white : Brand.gray500)
        : SvgPicture.asset(
            asset,
            fit: BoxFit.contain,
            colorFilter: ColorFilter.mode(
              active ? Colors.white : Brand.gray500,
              BlendMode.srcIn,
            ),
          );

    if (!active) return SizedBox(height: 24, width: 24, child: glyph);

    final tile = Container(
      height: 24,
      width: 24,
      padding: const EdgeInsets.all(4), // p-1
      decoration: BoxDecoration(
        gradient: Brand.gradient,
        borderRadius: BorderRadius.circular(Brand.rLg),
      ),
      child: glyph,
    );

    if (!showCheck) return tile;

    // The delivery tab carries a tick in the corner when it is the one open.
    return SizedBox(
      height: 24,
      width: 24,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          tile,
          Positioned(
            top: -8,
            right: -8,
            child: Container(
              height: 16,
              width: 16,
              decoration: const BoxDecoration(
                gradient: Brand.gradient,
                shape: BoxShape.circle,
              ),
              child: const Center(
                child: Text(
                  '✓',
                  style:
                      TextStyle(fontSize: 10, color: Colors.white, height: 1),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// The profile tab is an inline path in BottomNav.tsx rather than a file.
  Widget _profileGlyph(Color color) =>
      CustomPaint(painter: _PersonPainter(color));
}

class _PersonPainter extends CustomPainter {
  const _PersonPainter(this.color);

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    // M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z
    // m0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z   (viewBox 0 0 24 24)
    final s = size.width / 24;
    final paint = Paint()..color = color;
    canvas.drawCircle(Offset(12 * s, 8 * s), 4 * s, paint);
    final body = Path()
      ..moveTo(12 * s, 14 * s)
      ..cubicTo(9.33 * s, 14 * s, 4 * s, 15.34 * s, 4 * s, 18 * s)
      ..lineTo(4 * s, 20 * s)
      ..lineTo(20 * s, 20 * s)
      ..lineTo(20 * s, 18 * s)
      ..cubicTo(20 * s, 15.34 * s, 14.67 * s, 14 * s, 12 * s, 14 * s)
      ..close();
    canvas.drawPath(body, paint);
  }

  @override
  bool shouldRepaint(covariant _PersonPainter old) => old.color != color;
}
