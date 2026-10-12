import 'package:flutter/material.dart';

import '../theme/brand.dart';
import '../widgets/common.dart';

/// `app/congrats/page.tsx` -- shown when the pincode is served.
class CongratsScreen extends StatelessWidget {
  const CongratsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Image.asset(
                  'assets/images/congrats.png',
                  width: 288,
                  height: 288,
                  fit: BoxFit.contain,
                ),
                const SizedBox(height: 24),
                const Text(
                  'Congratulations!',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontFamily: Brand.heading,
                    fontSize: 30, // text-3xl
                    fontWeight: FontWeight.w700,
                    color: Brand.gray900,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  "We are available in your area.\nLet's get you started!",
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Brand.gray500),
                ),
                const SizedBox(height: 32),
                Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 448),
                    child: GradientButton(
                      label: 'Continue to Login',
                      height: 56,
                      radius: Brand.rXl,
                      fontSize: 18,
                      onPressed: () =>
                          Navigator.of(context).pushNamed('/login'),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// `app/not-available/page.tsx` -- shown when it is not.
class NotAvailableScreen extends StatelessWidget {
  const NotAvailableScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  '\u{1F614}',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 96), // text-8xl
                ),
                const SizedBox(height: 24),
                const Text(
                  'Sorry!',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontFamily: Brand.heading,
                    fontSize: 30,
                    fontWeight: FontWeight.w700,
                    color: Brand.gray900,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  "We are not available in your area yet.\nWe'll notify you when we expand!",
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Brand.gray500),
                ),
                const SizedBox(height: 32),
                Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 448),
                    child: GradientButton(
                      label: 'Try Another Pincode',
                      height: 56,
                      radius: Brand.rXl,
                      fontSize: 18,
                      onPressed: () => Navigator.of(context)
                          .pushReplacementNamed('/check-availability'),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
