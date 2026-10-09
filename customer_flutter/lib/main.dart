import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'routes.dart';
import 'services/notifications.dart';
import 'services/store.dart';
import 'theme/brand.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Read the saved session before the first frame, so the splash can decide
  // where to go without a second of guessing.
  await Store.init();
  runApp(const UrbanSteamApp());
}

/// Remembers which screen is on top, so the back-button policy below can ask
/// the same question App.tsx asked of `location.pathname`.
class _TopRoute extends NavigatorObserver {
  String? name;

  void _set(Route<dynamic>? route) {
    if (route is ModalRoute) name = route.settings.name;
  }

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) =>
      _set(route);

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) =>
      _set(previousRoute);

  @override
  void didRemove(Route<dynamic> route, Route<dynamic>? previousRoute) =>
      _set(previousRoute);

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) =>
      _set(newRoute);
}

class UrbanSteamApp extends StatefulWidget {
  const UrbanSteamApp({super.key});

  @override
  State<UrbanSteamApp> createState() => _UrbanSteamAppState();
}

class _UrbanSteamAppState extends State<UrbanSteamApp>
    with WidgetsBindingObserver {
  final _navigator = GlobalKey<NavigatorState>();
  final _topRoute = _TopRoute();
  StreamSubscription<String?>? _authWatch;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    // The order monitor follows whoever is signed in, rather than starting once
    // at launch: signing in used to bring no notifications until the app was
    // restarted, and signing out left it polling under the previous customer.
    _authWatch = Store.authChanges.listen((customerId) {
      if (customerId == null) {
        Notifications.instance.stop();
      } else {
        Notifications.instance.start();
      }
    });
    if (Store.isSignedIn) Notifications.instance.start();

    // Tapping a notification opens the order it is about.
    Notifications.instance.tappedOrderId.addListener(_openTappedOrder);
  }

  @override
  void dispose() {
    Notifications.instance.tappedOrderId.removeListener(_openTappedOrder);
    _authWatch?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  void _openTappedOrder() {
    final orderId = Notifications.instance.tappedOrderId.value;
    if (orderId == null || orderId.isEmpty) return;
    Notifications.instance.tappedOrderId.value = null;
    _navigator.currentState?.pushNamed(
      '/order-details',
      arguments: {'orderId': orderId},
    );
  }

  /// The hardware back button, with the same rule App.tsx applied through its
  /// global `backButton` listener: only the home screen closes the app, and a
  /// screen with nothing behind it goes home instead of quitting. Anything else
  /// is an ordinary back step, so this hands it on untouched.
  ///
  /// Placing an order clears the stack behind the confirmation screen, which is
  /// exactly the case this catches -- back there used to drop the customer out
  /// of the app altogether.
  @override
  Future<bool> didPopRoute() async {
    final navigator = _navigator.currentState;
    if (navigator == null || navigator.canPop()) return false;
    final name = _topRoute.name;
    if (name == null || name == '/' || name == '/home') return false;
    navigator.pushNamedAndRemoveUntil('/home', (r) => false);
    return true;
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    Notifications.instance
        .setForeground(state == AppLifecycleState.resumed);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Urban Steam',
      debugShowCheckedModeBanner: false,
      navigatorKey: _navigator,
      navigatorObservers: [_topRoute],
      theme: Brand.theme(),
      initialRoute: '/',
      onGenerateRoute: AppRoutes.generate,
      // Phone font-size settings can otherwise blow the layout apart; the app
      // follows the user's choice but stops short of unusable extremes.
      builder: (context, child) {
        final media = MediaQuery.of(context);
        final scale = media.textScaler.scale(16) / 16;
        return AnnotatedRegion<SystemUiOverlayStyle>(
          // The Capacitor build ran with `setOverlaysWebView({overlay:false})`,
          // so the status bar is its own strip above the app rather than
          // something the screens paint behind. SafeArea reproduces that.
          value: const SystemUiOverlayStyle(
            statusBarColor: Colors.white,
            statusBarIconBrightness: Brightness.dark,
            statusBarBrightness: Brightness.light,
          ),
          child: MediaQuery(
            data: media.copyWith(
              textScaler: TextScaler.linear(scale.clamp(0.85, 1.3)),
            ),
            // White behind the status-bar strip, so it reads as part of the
            // app rather than a black band.
            child: ColoredBox(
              color: Colors.white,
              child: SafeArea(
                top: true,
                bottom: false,
                child: child ?? const SizedBox.shrink(),
              ),
            ),
          ),
        );
      },
    );
  }
}
