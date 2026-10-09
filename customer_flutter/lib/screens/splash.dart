import 'dart:async';

import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

import '../services/store.dart';

/// The opening animation, the same Lottie file the web app played.
///
/// The hard rule here, learned the expensive way in the Capacitor build: the
/// animation never decides whether the app opens. Timers that nothing can
/// cancel move the app on, so a device that renders the animation slowly, or
/// not at all, still reaches the first screen.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  // 88 frames at 15fps, just under six seconds.
  static const _animation = Duration(milliseconds: 5900);

  // If the animation has not reported itself ready by now it is not worth
  // waiting for on this device.
  static const _giveUp = Duration(milliseconds: 2500);

  // Nothing may hold the splash longer than this, whatever happens.
  static const _hardLimit = Duration(milliseconds: 7400);

  late final AnimationController _controller =
      AnimationController(vsync: this, duration: _animation);

  bool _ready = false;
  bool _movedOn = false;
  Timer? _giveUpTimer;
  Timer? _hardLimitTimer;

  @override
  void initState() {
    super.initState();
    _giveUpTimer = Timer(_giveUp, () {
      if (!_ready) _next();
    });
    _hardLimitTimer = Timer(_hardLimit, _next);
    _controller.addStatusListener((status) {
      if (status == AnimationStatus.completed) _next();
    });
  }

  @override
  void dispose() {
    _giveUpTimer?.cancel();
    _hardLimitTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _next() {
    if (_movedOn || !mounted) return;
    _movedOn = true;
    Navigator.of(context)
        .pushReplacementNamed(Store.isSignedIn ? '/home' : '/welcome');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: GestureDetector(
        onTap: _next,
        behavior: HitTestBehavior.opaque,
        child: Center(
          child: Lottie.asset(
            'assets/anim/splash_animation.json',
            controller: _controller,
            repeat: false,
            width: double.infinity,
            height: double.infinity,
            fit: BoxFit.contain,
            onLoaded: (composition) {
              _ready = true;
              _controller
                ..duration = composition.duration
                ..forward(from: 0);
            },
            // A missing or broken asset must not leave a blank screen: the
            // timers above still fire, and until they do the logo shows.
            errorBuilder: (_, __, ___) => const Center(
              child: Text(
                'Urban Steam',
                style: TextStyle(
                  fontFamily: 'Montserrat',
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
