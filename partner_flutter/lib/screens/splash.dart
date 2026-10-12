import 'package:flutter/material.dart';

import '../services/store.dart';
import '../theme/brand.dart';

/// `app/page.tsx` -- the screen the app opens on while it decides where to go.
///
/// A signed-in captain lands on their pickups, everyone else on the welcome
/// screen. The web version read localStorage inside an effect, so this was on
/// screen for a moment on every launch; here the session is already loaded
/// before the first frame, and the delay below only exists so the animation
/// does not flash past.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  late final AnimationController _pulse = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 2),
  )..repeat();
  late final AnimationController _bounce = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1500),
  )..repeat();

  @override
  void initState() {
    super.initState();
    _go();
  }

  @override
  void dispose() {
    _pulse.dispose();
    _bounce.dispose();
    super.dispose();
  }

  Future<void> _go() async {
    await Future<void>.delayed(const Duration(milliseconds: 900));
    if (!mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil(
      Store.isSignedIn ? '/pickups' : '/welcome',
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedBuilder(
                animation: Listenable.merge([_pulse, _bounce]),
                builder: (context, _) {
                  // pulse: scale 1 -> 1.05 -> 1, with a ring that fades outward
                  final t = _pulse.value;
                  final scale = 1 + 0.05 * (1 - (2 * t - 1).abs());
                  final ring = 20.0 * t;
                  // bounce: the scooter lifts 10px and settles
                  final lift = -10.0 * (1 - (2 * _bounce.value - 1).abs());
                  return Transform.scale(
                    scale: scale,
                    child: Container(
                      height: 180,
                      width: 180,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        border: Border.all(color: Brand.red500, width: 4),
                        boxShadow: [
                          BoxShadow(
                            color:
                                Brand.red500.withValues(alpha: 0.4 * (1 - t)),
                            spreadRadius: ring,
                          ),
                        ],
                      ),
                      child: Center(
                        child: Transform.translate(
                          offset: Offset(0, lift),
                          child: const Text('\u{1F6F5}',
                              style: TextStyle(fontSize: 80)),
                        ),
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 30),
              const Text(
                'Urban Steam Captain',
                style: TextStyle(
                  fontFamily: Brand.heading,
                  fontSize: 32,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1F2937),
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'Smart pickups & fast deliveries',
                style: TextStyle(
                    fontSize: 16,
                    height: Brand.leadBase,
                    color: Color(0xFF6B7280)),
              ),
              const SizedBox(height: 30),
              AnimatedBuilder(
                animation: _pulse,
                builder: (context, _) => Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    for (var i = 0; i < 3; i++) ...[
                      if (i > 0) const SizedBox(width: 8),
                      _Dot(phase: (_pulse.value + i * 0.2) % 1),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'Initializing...',
                style: TextStyle(
                    fontSize: 14,
                    height: Brand.leadSm,
                    color: Color(0xFF9CA3AF)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Dot extends StatelessWidget {
  const _Dot({required this.phase});

  final double phase;

  @override
  Widget build(BuildContext context) {
    // dotPulse: 0.8 scale at rest, 1.2 at 40% through, half opacity at rest.
    final active =
        phase < 0.8 ? (1 - (phase / 0.4 - 1).abs()).clamp(0.0, 1.0) : 0.0;
    return Opacity(
      opacity: 0.5 + 0.5 * active,
      child: Transform.scale(
        scale: 0.8 + 0.4 * active,
        child: Container(
          height: 10,
          width: 10,
          decoration: const BoxDecoration(
            color: Brand.red500,
            shape: BoxShape.circle,
          ),
        ),
      ),
    );
  }
}
