import 'package:flutter/material.dart';

import '../theme/brand.dart';

/// The five-tab bar from customer/src/components/BottomNavigation.tsx: home,
/// prices, a raised cart button in the middle, order history and profile.
/// The active icon is painted with the brand gradient, inactive ones grey.
class AppBottomNav extends StatelessWidget {
  const AppBottomNav({super.key, required this.current});

  /// The route name of the screen showing this bar.
  final String current;

  static const double height = 76;

  void _go(BuildContext context, String route) {
    if (route == current) return;
    // Every tab is a top-level destination, so replace rather than stack: the
    // back button should not walk through a history of tab taps.
    Navigator.of(context).pushReplacementNamed(route);
  }

  Widget _icon(BuildContext context, IconData icon, String route) {
    final active = route == current;
    final child = Icon(
      icon,
      size: 26,
      color: active ? Colors.white : const Color(0xFF9CA3AF),
    );
    return Expanded(
      child: InkWell(
        onTap: () => _go(context, route),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Center(
            child: active
                ? ShaderMask(
                    shaderCallback: (b) => Brand.gradient.createShader(
                      Rect.fromLTWH(0, 0, b.width, b.height),
                    ),
                    child: child,
                  )
                : child,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).padding.bottom;
    return Container(
      padding: EdgeInsets.only(bottom: bottomInset),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Brand.border)),
        boxShadow: [
          BoxShadow(
            color: Color(0x1A000000),
            blurRadius: 16,
            offset: Offset(0, -2),
          ),
        ],
      ),
      child: SizedBox(
        height: height,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            _icon(context, Icons.home_outlined, '/home'),
            _icon(context, Icons.local_offer_outlined, '/prices'),
            Expanded(
              child: InkWell(
                onTap: () => _go(context, '/cart'),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      height: 46,
                      width: 46,
                      decoration: BoxDecoration(
                        gradient: Brand.gradient,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                        boxShadow: [
                          BoxShadow(
                            color: Brand.purple.withValues(alpha: 0.3),
                            blurRadius: 10,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.shopping_cart,
                        color: Colors.white,
                        size: 24,
                      ),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Your Cart',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: Brand.purple,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            _icon(context, Icons.history, '/booking-history'),
            _icon(context, Icons.person_outline, '/profile'),
          ],
        ),
      ),
    );
  }
}

/// Wallet and Refer & Earn do not use the shared bar: each has its own copy
/// inline, with no labels, a blue cart button instead of the brand gradient,
/// the profile icon lit whatever the route, and a middle button that goes to
/// the **legacy** `/booking` screen rather than the cart. The two copies are
/// not even the same size as each other, which is why this takes the
/// measurements.
class LegacyBottomNav extends StatelessWidget {
  const LegacyBottomNav({
    super.key,
    required this.iconSize,
    required this.circleSize,
    required this.cartSize,
    required this.padding,
  });

  /// Wallet's: `px-2 py-2`, `w-5 h-5` icons, a `w-8 h-8` button.
  const LegacyBottomNav.wallet({super.key})
      : iconSize = 20,
        circleSize = 32,
        cartSize = 16,
        padding = const EdgeInsets.symmetric(horizontal: 8, vertical: 8);

  /// Refer & Earn's: `px-4 py-4`, `w-6 h-6` icons, a `w-10 h-10` button.
  const LegacyBottomNav.referEarn({super.key})
      : iconSize = 24,
        circleSize = 40,
        cartSize = 20,
        padding = const EdgeInsets.symmetric(horizontal: 16, vertical: 16);

  final double iconSize;
  final double circleSize;
  final double cartSize;
  final EdgeInsets padding;

  static const _grey = Color(0xFF9CA3AF);
  static const _blue = Color(0xFF3B82F6);
  static const _blue700 = Color(0xFF1D4ED8);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Brand.border)),
        boxShadow: [
          BoxShadow(
            color: Color(0x26000000),
            blurRadius: 25,
            offset: Offset(0, -12),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: padding,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _item(context, Icons.home_outlined, '/home'),
              _item(context, Icons.local_offer_outlined, '/prices'),
              _cart(context),
              _item(context, Icons.rotate_left, '/booking-history'),
              _item(context, Icons.person_outline, '/profile', lit: true),
            ],
          ),
        ),
      ),
    );
  }

  Widget _item(BuildContext context, IconData icon, String route,
      {bool lit = false}) {
    return InkResponse(
      onTap: () => Navigator.of(context).pushNamed(route),
      child: Padding(
        padding: const EdgeInsets.all(4),
        child: Icon(icon, size: iconSize, color: lit ? _blue : _grey),
      ),
    );
  }

  Widget _cart(BuildContext context) {
    return InkResponse(
      onTap: () => Navigator.of(context).pushNamed('/booking'),
      child: Padding(
        padding: const EdgeInsets.all(4),
        child: Container(
          height: circleSize,
          width: circleSize,
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [_blue, _blue700]),
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 2),
            boxShadow: const [
              BoxShadow(
                color: Color(0x1F000000),
                blurRadius: 15,
                offset: Offset(0, 10),
              ),
            ],
          ),
          child: Icon(Icons.shopping_cart, size: cartSize, color: Colors.white),
        ),
      ),
    );
  }
}
