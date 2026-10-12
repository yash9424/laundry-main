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
      body: WebCentre(
        belowStatusBar: false, // min-h-screen
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            // `items-center`. Stretch would pull the illustration out to the
            // full width and quietly ignore the 288 it asks for.
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Image.asset(
                'assets/images/congrats.png',
                // The asset is 412x392 and Tailwind preflight puts `height: auto` on
                // every img, so `width={288} height={288}` draws 288x274.
                width: 288,
                fit: BoxFit.contain,
              ),
              const SizedBox(height: 24),
              const Text(
                'Congratulations!',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: Brand.heading,
                  fontSize: Brand.h1, // <h1>: see Brand.h1
                  fontWeight: FontWeight.w700,
                  color: Brand.gray900,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                "We are available in your area.\nLet's get you started!",
                textAlign: TextAlign.center,
                style: TextStyle(color: Brand.gray600),
              ),
              const SizedBox(height: 32),
              Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 448), // max-w-md
                  child: SizedBox(
                    width: double.infinity, // w-full
                    child: GradientButton(
                      label: 'Continue to Login',
                      height: 51, // py-4 around text-lg's line box at 12px
                      radius: Brand.rXl,
                      fontSize: Brand.buttonText,
                      onPressed: () =>
                          Navigator.of(context).pushNamed('/login'),
                    ),
                  ),
                ),
              ),
            ],
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
      body: WebCentre(
        belowStatusBar: false, // min-h-screen
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            // `items-center`. Stretch would pull the illustration out to the
            // full width and quietly ignore the 288 it asks for.
            crossAxisAlignment: CrossAxisAlignment.center,
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
                  fontSize: Brand.h1, // <h1>: see Brand.h1
                  fontWeight: FontWeight.w700,
                  color: Brand.gray900,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                "We are not available in your area yet.\nWe'll notify you when we expand!",
                textAlign: TextAlign.center,
                style: TextStyle(color: Brand.gray600),
              ),
              const SizedBox(height: 32),
              Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 448), // max-w-md
                  child: SizedBox(
                    width: double.infinity, // w-full
                    child: GradientButton(
                      label: 'Try Another Pincode',
                      height: 51, // py-4 around text-lg's line box at 12px
                      radius: Brand.rXl,
                      fontSize: Brand.buttonText,
                      onPressed: () => Navigator.of(context)
                          .pushReplacementNamed('/check-availability'),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
