import 'package:flutter/material.dart';

import '../theme/brand.dart';
import '../widgets/common.dart';

/// customer/src/pages/Welcome.tsx
class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16), // px-4
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 320), // max-w-xs
              child: Column(
                children: [
                  Image.asset(
                    'assets/images/get_started.png',
                    width: 256, // w-64
                    height: 256,
                    fit: BoxFit.contain,
                  ),
                  const SizedBox(height: 16), // mb-4
                  const GradientText(
                    'Urban Steam',
                    align: TextAlign.center,
                    style: TextStyle(
                      fontFamily: Brand.heading,
                      fontSize: 30, // text-3xl
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8), // mb-2
                  const GradientText(
                    'Reimagining Ironing for the modern India',
                    align: TextAlign.center,
                    style: TextStyle(
                      fontSize: 16, // text-base
                      fontWeight: FontWeight.w400,
                      height: 1.625, // leading-relaxed
                    ),
                  ),
                  const SizedBox(height: 24), // mb-6
                  GradientButton(
                    label: 'Get Started',
                    height: 40, // default Button size -> h-10
                    radius: Brand.rXl, // rounded-xl
                    fontSize: 14, // text-sm
                    fontWeight: FontWeight.w500, // font-medium
                    onPressed: () =>
                        Navigator.of(context).pushNamed('/check-availability'),
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
