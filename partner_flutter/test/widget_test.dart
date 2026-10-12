import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:partnerapp/routes.dart';
import 'package:partnerapp/theme/brand.dart';

void main() {
  group('radius scale', () {
    // The Captain app has no shadcn: globals.css is a bare
    // `@import "tailwindcss"`, so the radii are stock Tailwind and ascend.
    // The customer app redefines them from `--radius`, where lg comes out
    // *larger* than xl. Copying a widget across without checking gets this
    // wrong, and it is invisible until someone compares screenshots.
    test('is stock Tailwind, ascending', () {
      expect(Brand.rLg, 8);
      expect(Brand.rXl, 12);
      expect(Brand.r2xl, 16);
      expect(Brand.rLg < Brand.rXl, isTrue);
      expect(Brand.rXl < Brand.r2xl, isTrue);
    });
  });

  group('routes', () {
    // The order monitor sends a screen path with each notification and the
    // bottom bar navigates by path, so every one of these has to resolve.
    const paths = [
      '/',
      '/welcome',
      '/check-availability',
      '/congrats',
      '/not-available',
      '/login',
      '/verify',
      '/pickups',
      '/pickups/start',
      '/pickups/confirm',
      '/hub/drop',
      '/hub/delivered',
      '/delivery/pick',
      '/delivery/details',
      '/delivery/history',
      '/profile',
      '/profile/create',
      '/profile/personal',
      '/profile/bank',
      '/profile/kyc',
      '/profile/kyc-details',
      '/notifications',
    ];

    for (final path in paths) {
      test('$path resolves', () {
        final route = AppRoutes.generate(RouteSettings(name: path));
        expect(route, isNotNull, reason: '$path should have a screen');
      });
    }

    test('the screens the order monitor links to exist', () {
      for (final path in ['/pickups', '/delivery/pick']) {
        expect(AppRoutes.generate(RouteSettings(name: path)), isNotNull);
      }
    });
  });
}
