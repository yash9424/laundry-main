import 'package:flutter/material.dart';

import '../theme/brand.dart';
import '../widgets/common.dart';

/// customer/src/pages/Congrats.tsx
class CongratsScreen extends StatelessWidget {
  const CongratsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Brand.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16), // px-4
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 384), // max-w-sm
              child: Column(
                children: [
                  Image.asset(
                    'assets/images/congrats.png',
                    width: 288,
                    height: 288,
                    fit: BoxFit.contain,
                  ),
                  const SizedBox(height: 24), // mb-6
                  const Text(
                    'Congrats!',
                    style: TextStyle(
                      fontFamily: Brand.heading,
                      fontSize: 30, // text-3xl
                      fontWeight: FontWeight.w700,
                      color: Brand.primary, // text-primary
                    ),
                  ),
                  const SizedBox(height: 16), // mb-4
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 8), // px-2
                    child: Text(
                      "You're in. You can now focus on what matters. "
                      'Your ironing is our problem now. '
                      "Let's get started.",
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 14, // text-sm
                        color: Brand.foreground,
                        height: 1.5,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24), // mb-6
                  GradientButton(
                    label: 'Continue to Signup',
                    height: 44, // size="lg"
                    radius: Brand.r2xl,
                    fontSize: 16,
                    onPressed: () => Navigator.of(context).pushNamed('/login'),
                  ),
                  const SizedBox(height: 16), // mt-4
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text(
                        'Not your location?',
                        style: TextStyle(
                            fontSize: 12, color: Brand.mutedForeground),
                      ),
                      const SizedBox(width: 4), // ml-1
                      GestureDetector(
                        onTap: () => Navigator.of(context).pop(),
                        child: const Text(
                          'Change Pincode',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Brand.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
