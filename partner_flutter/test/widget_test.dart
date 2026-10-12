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

  group('heading and button sizes', () {
    // globals.css ends with plain `h1 { font-size: 16px }` style rules,
    // unlayered, and Tailwind v4 puts every utility inside @layer utilities.
    // Unlayered beats layered, so these win over text-lg / text-2xl /
    // text-3xl wherever the markup uses them: the tag decides the size, the
    // class does not. Someone reading sizes off the classes will make every
    // title and every button a third too big.
    test('come from the tag, not the Tailwind class', () {
      expect(Brand.h1, 16);
      expect(Brand.h2, 14);
      expect(Brand.h3, 14);
      expect(Brand.h4, 13);
      expect(Brand.buttonText, 12);
    });

    test('a button is smaller than any heading', () {
      // If this ever stops holding, someone has "fixed" a size upward.
      expect(Brand.buttonText < Brand.h4, isTrue);
      expect(Brand.h2 < Brand.h1, isTrue);
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
