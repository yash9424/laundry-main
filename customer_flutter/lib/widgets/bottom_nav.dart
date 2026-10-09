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
    final child = Icon(icon, size: 26, color: active ? Colors.white : const Color(0xFF9CA3AF));
    return Expanded(
      child: InkWell(
        onTap: () => _go(context, route),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Center(
            child: active
                ? ShaderMask(
                    shaderCallback: (b) => Brand.gradient
                        .createShader(Rect.fromLTWH(0, 0, b.width, b.height)),
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
          BoxShadow(color: Color(0x1A000000), blurRadius: 16, offset: Offset(0, -2)),
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
                      child: const Icon(Icons.shopping_cart,
                          color: Colors.white, size: 24),
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
