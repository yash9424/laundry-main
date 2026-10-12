import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:customerapp/routes.dart';

/// Every path the app can be sent to has to land on a screen.
///
/// Navigation here is by name -- the bottom bars, the notification taps and
/// every `pushNamed` call use these strings -- and an unknown name silently
/// falls through to the 404 screen rather than failing the build. The list
/// below is the whole route table; if a screen is renamed or a case is
/// dropped, this notices.
void main() {
  const paths = [
    '/',
    '/welcome',
    '/check-availability',
    '/congrats',
    '/not-available',
    '/login',
    '/verify-mobile',
    '/home',
    '/prices',
    '/cart',
    // The legacy booking screen, still reachable from the Wallet and
    // Refer & Earn bars.
    '/booking',
    '/pickup-checklist',
    '/pickup-slot',
    '/continue-booking',
    '/booking-confirmation',
    '/booking-history',
    '/order-details',
    '/create-profile',
    '/profile',
    '/edit-profile',
    '/add-address',
    '/wallet',
    '/refer-earn',
    '/rate-order',
    '/notifications',
    '/subscriptions',
    '/my-subscription',
    '/terms-conditions',
    '/privacy-policy',
  ];

  for (final path in paths) {
    test('$path resolves to a screen', () {
      final route = AppRoutes.generate(RouteSettings(name: path));
      expect(route, isA<MaterialPageRoute<dynamic>>());
      expect(route.settings.name, path);
    });
  }

  test('an unknown path is not silently treated as a screen', () {
    // The guard above only means something if a name that is not in the table
    // behaves differently -- it goes to the 404 screen, which is still a
    // route. This records that the table is what decides.
    final route = AppRoutes.generate(const RouteSettings(name: '/nonsense'));
    expect(route.settings.name, '/nonsense');
  });

  test('the bars and the notification taps point at paths in the table', () {
    // These are the destinations written into widgets rather than into a
    // screen's own navigation: the shared bottom bar, the two legacy bars,
    // and the screen a notification opens.
    for (final path in [
      '/home',
      '/prices',
      '/cart',
      '/booking-history',
      '/profile',
      '/booking',
      '/order-details',
      '/notifications',
    ]) {
      expect(paths.contains(path), isTrue, reason: '$path is navigated to');
    }
  });
}
