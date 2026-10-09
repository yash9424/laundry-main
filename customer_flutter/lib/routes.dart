import 'package:flutter/material.dart';

import 'models/checkout.dart';

import 'screens/check_availability.dart';
import 'screens/add_address.dart';
import 'screens/booking_confirmation.dart';
import 'screens/booking_history.dart';
import 'screens/cart.dart';
import 'screens/congrats.dart';
import 'screens/continue_booking.dart';
import 'screens/create_profile.dart';
import 'screens/edit_profile.dart';
import 'screens/home.dart';
import 'screens/legal.dart';
import 'screens/my_subscription.dart';
import 'screens/notifications.dart';
import 'screens/login.dart';
import 'screens/not_available.dart';
import 'screens/order_details.dart';
import 'screens/pickup_checklist.dart';
import 'screens/pickup_slot.dart';
import 'screens/prices.dart';
import 'screens/profile.dart';
import 'screens/rate_order.dart';
import 'screens/refer_earn.dart';
import 'screens/splash.dart';
import 'screens/subscriptions.dart';
import 'screens/verify_mobile.dart';
import 'screens/wallet.dart';
import 'screens/welcome.dart';

/// Route names deliberately match the web app's paths, so a screen here and
/// the page it replaces are easy to line up.
class AppRoutes {
  AppRoutes._();

  static Route<dynamic> generate(RouteSettings settings) {
    final args = settings.arguments;

    Widget page() {
      switch (settings.name) {
        case '/':
          return const SplashScreen();
        case '/welcome':
          return const WelcomeScreen();
        case '/check-availability':
          return const CheckAvailabilityScreen();
        case '/congrats':
          return const CongratsScreen();
        case '/not-available':
          return const NotAvailableScreen();
        case '/login':
          return const LoginScreen();
        case '/verify-mobile':
          return VerifyMobileScreen(
            mobileNumber: (args is Map && args['mobileNumber'] is String)
                ? args['mobileNumber'] as String
                : '',
          );
        case '/home':
          return const HomeScreen();
        case '/prices':
          return const PricesScreen();
        case '/cart':
          return const CartScreen();
        case '/pickup-checklist':
          return PickupChecklistScreen(draft: CheckoutDraft.fromArguments(args));
        case '/pickup-slot':
          return PickupSlotScreen(draft: CheckoutDraft.fromArguments(args));
        case '/continue-booking':
          return ContinueBookingScreen(draft: CheckoutDraft.fromArguments(args));
        case '/booking-confirmation':
          return BookingConfirmationScreen(
            args: args is Map
                ? Map<String, dynamic>.from(args)
                : const <String, dynamic>{},
          );
        case '/booking-history':
          return const BookingHistoryScreen();
        case '/order-details':
          return OrderDetailsScreen(
            orderId: (args is Map ? args['orderId']?.toString() : null) ?? '',
          );
        case '/create-profile':
          return CreateProfileScreen(
            customerId: (args is Map) ? args['customerId'] as String? : null,
            mobileNumber: (args is Map) ? args['mobileNumber'] as String? : null,
          );
        case '/profile':
          return const ProfileScreen();
        case '/edit-profile':
          return const EditProfileScreen();
        case '/add-address':
          return AddAddressScreen(
            editIndex: args is Map ? args['editIndex'] as int? : null,
          );
        case '/wallet':
          return const WalletScreen();
        case '/refer-earn':
          return const ReferEarnScreen();
        case '/rate-order':
          return RateOrderScreen(
            orderId: (args is Map ? args['orderId']?.toString() : null) ?? '',
          );
        case '/notifications':
          return const NotificationsScreen();
        case '/subscriptions':
          return const SubscriptionsScreen();
        case '/my-subscription':
          return const MySubscriptionScreen();
        case '/terms-conditions':
          return const TermsConditionsScreen();
        case '/privacy-policy':
          return const PrivacyPolicyScreen();
        default:
          return const _NotFound();
      }
    }

    return MaterialPageRoute(builder: (_) => page(), settings: settings);
  }
}

class _NotFound extends StatelessWidget {
  const _NotFound();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('404', style: TextStyle(fontSize: 44, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text('This screen does not exist.'),
            const SizedBox(height: 16),
            TextButton(
              onPressed: () =>
                  Navigator.of(context).pushNamedAndRemoveUntil('/home', (r) => false),
              child: const Text('Go home'),
            ),
          ],
        ),
      ),
    );
  }
}
