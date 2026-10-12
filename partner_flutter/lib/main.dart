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
  runApp(const CaptainApp());
}

/// Remembers which screen is on top, so the back-button policy below can ask
/// the same question the web app asked of `location.pathname`.
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

class CaptainApp extends StatefulWidget {
  const CaptainApp({super.key});

  @override
  State<CaptainApp> createState() => _CaptainAppState();
}

class _CaptainAppState extends State<CaptainApp> with WidgetsBindingObserver {
  final _navigator = GlobalKey<NavigatorState>();
  final _topRoute = _TopRoute();
  StreamSubscription<String?>? _authWatch;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    // The order monitor follows whoever is signed in rather than starting once
    // at launch. `useAuthId` in the web app watched localStorage on a timer for
    // the same reason: signing in used to bring no notifications until the app
    // was restarted, and signing out left it polling under the previous
    // captain's id.
    _authWatch = Store.authChanges.listen((partnerId) {
      if (partnerId == null) {
        Notifications.instance.stop();
      } else {
        Notifications.instance.start();
      }
    });
    if (Store.isSignedIn) Notifications.instance.start();

    // Tapping a notification opens the screen it is about. The Capacitor build
    // registered no listener, so tapping one there did nothing.
    Notifications.instance.tappedOrderId.addListener(_openTapped);
  }

  @override
  void dispose() {
    Notifications.instance.tappedOrderId.removeListener(_openTapped);
    _authWatch?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  void _openTapped() {
    final orderId = Notifications.instance.tappedOrderId.value;
    if (orderId == null || orderId.isEmpty) return;
    Notifications.instance.tappedOrderId.value = null;
    _navigator.currentState?.pushNamed('/pickups');
  }

  /// The hardware back button. Only the three work screens the bottom bar
  /// leads to are places a captain should be able to leave the app from; from
  /// anywhere with nothing behind it, go to the pickups list rather than
  /// quitting mid-job.
  @override
  Future<bool> didPopRoute() async {
    final navigator = _navigator.currentState;
    if (navigator == null || navigator.canPop()) return false;
    final name = _topRoute.name;
    const exits = {'/', '/welcome', '/pickups'};
    if (name == null || exits.contains(name)) return false;
    navigator.pushNamedAndRemoveUntil('/pickups', (r) => false);
    return true;
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // No point polling for a captain who is not looking; it only costs them
    // battery and data.
    Notifications.instance.setForeground(state == AppLifecycleState.resumed);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Urban Steam Captain',
      debugShowCheckedModeBanner: false,
      navigatorKey: _navigator,
      navigatorObservers: [_topRoute],
      theme: Brand.theme(),
      initialRoute: '/',
      onGenerateRoute: AppRoutes.generate,
      builder: (context, child) {
        final media = MediaQuery.of(context);
        final scale = media.textScaler.scale(16) / 16;
        return AnnotatedRegion<SystemUiOverlayStyle>(
          // capacitor.config.ts sets StatusBar overlaysWebView: false, so the
          // status bar is its own strip above the app rather than something
          // the screens paint behind. SafeArea reproduces that.
          value: const SystemUiOverlayStyle(
            statusBarColor: Colors.white,
            statusBarIconBrightness: Brightness.dark,
            statusBarBrightness: Brightness.light,
          ),
          child: MediaQuery(
            // Phone font-size settings can otherwise blow the layout apart; the
            // app follows the choice but stops short of unusable extremes.
            data: media.copyWith(
              textScaler: TextScaler.linear(scale.clamp(0.85, 1.3)),
            ),
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
