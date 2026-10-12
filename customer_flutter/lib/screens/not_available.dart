import 'package:flutter/material.dart';

import '../theme/brand.dart';
import '../widgets/common.dart';

/// customer/src/pages/NotAvailable.tsx
class NotAvailableScreen extends StatelessWidget {
  const NotAvailableScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Brand.background,
      body: QuirkSafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 32,
            ), // px-4 py-8
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 320), // max-w-xs
              child: Column(
                children: [
                  Image.asset(
                    'assets/images/not_available.png',
                    width: 288,
                    height: 288,
                    fit: BoxFit.contain,
                  ),
                  const SizedBox(height: 24), // mb-6
                  const Text(
                    "Sorry, we're not\nhere yet",
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: Brand.heading,
                      fontSize: 24, // text-2xl
                      fontWeight: FontWeight.w700,
                      color: Brand.foreground,
                      height: 4 / 3, // text-2xl -> 24/32
                    ),
                  ),
                  const SizedBox(height: 16), // mb-4
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 8), // px-2
                    child: Text(
                      "We are expanding fast! We'll notify you when we arrive.",
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 14, // text-sm
                        color: Brand.mutedForeground,
                        height: 10 / 7, // text-sm -> 14/20
                      ),
                    ),
                  ),
                  const SizedBox(height: 32), // mb-8
                  GradientButton(
                    label: 'Change Pincode',
                    height: 44,
                    radius: Brand.r2xl,
                    fontSize: 16,
                    // The web screen navigates rather than going back, so the
                    // pincode field opens empty.
                    onPressed: () =>
                        Navigator.of(context).pushNamed('/check-availability'),
                  ),
                  const SizedBox(height: 16), // space-y-4
                  GestureDetector(
                    onTap: () => Navigator.of(
                      context,
                    ).pushNamedAndRemoveUntil('/welcome', (r) => false),
                    child: const Text(
                      'Back to Home',
                      style: TextStyle(
                        fontFamily: Brand.heading, // a <button>
                        color: Brand.mutedForeground,
                        fontSize: 14,
                      ),
                    ),
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
