import 'package:flutter/material.dart';

import 'screens/check_availability.dart';
import 'screens/congrats.dart';
import 'screens/delivery_details.dart';
import 'screens/delivery_history.dart';
import 'screens/delivery_pick.dart';
import 'screens/hub_delivered.dart';
import 'screens/hub_drop.dart';
import 'screens/login.dart';
import 'screens/notifications.dart';
import 'screens/pickup_confirm.dart';
import 'screens/pickup_start.dart';
import 'screens/pickups.dart';
import 'screens/profile.dart';
import 'screens/profile_bank.dart';
import 'screens/profile_create.dart';
import 'screens/profile_kyc.dart';
import 'screens/profile_kyc_details.dart';
import 'screens/profile_personal.dart';
import 'screens/splash.dart';
import 'screens/verify.dart';
import 'screens/welcome.dart';

/// Every screen, under the same path the Next.js app used.
///
/// Keeping the paths identical is not cosmetic: the order monitor sends a
/// screen name with each notification ('/pickups', '/delivery/pick'), and the
/// bottom bar navigates by path. Renaming one would quietly break the other.
///
/// The three `[id]` routes in `partner/src/app` are not here. They are orphans
/// -- the shipped app navigates with query strings instead -- and porting them
/// would carry dead code across (CLAUDE.md 8.3).
class AppRoutes {
  AppRoutes._();

  static Route<dynamic>? generate(RouteSettings settings) {
    final args = settings.arguments is Map
        ? Map<String, dynamic>.from(settings.arguments as Map)
        : const <String, dynamic>{};

    Widget page;
    switch (settings.name) {
      case '/':
        page = const SplashScreen();
      case '/welcome':
        page = const WelcomeScreen();
      case '/check-availability':
        page = const CheckAvailabilityScreen();
      case '/congrats':
        page = const CongratsScreen();
      case '/not-available':
        page = const NotAvailableScreen();
      case '/login':
        page = const LoginScreen();
      case '/verify':
        page = const VerifyScreen();

      case '/pickups':
        page = const PickupsScreen();
      case '/pickups/start':
        page = PickupStartScreen(orderId: (args['id'] ?? '').toString());
      case '/pickups/confirm':
        page = PickupConfirmScreen(orderId: (args['id'] ?? '').toString());

      case '/hub/drop':
        page = const HubDropScreen();
      case '/hub/delivered':
        page = const HubDeliveredScreen();

      case '/delivery/pick':
        page = const DeliveryPickScreen();
      case '/delivery/details':
        page = DeliveryDetailsScreen(orderId: (args['id'] ?? '').toString());
      case '/delivery/history':
        page = const DeliveryHistoryScreen();

      case '/profile':
        page = const ProfileScreen();
      case '/profile/create':
        page = const ProfileCreateScreen();
      case '/profile/personal':
        page = const ProfilePersonalScreen();
      case '/profile/bank':
        page = const ProfileBankScreen();
      case '/profile/kyc':
        page = const ProfileKycScreen();
      case '/profile/kyc-details':
        page = const ProfileKycDetailsScreen();

      case '/notifications':
        page = const NotificationsScreen();

      default:
        page = const SplashScreen();
    }

    return MaterialPageRoute<dynamic>(builder: (_) => page, settings: settings);
  }
}
