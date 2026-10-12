import 'package:flutter/material.dart';

import '../theme/brand.dart';
import '../widgets/common.dart';

/// `app/welcome/page.tsx`.
///
/// Both the title and the line under it are painted with the brand gradient
/// through `background-clip: text`, which is what GradientText reproduces.
class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: WebCentre(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16), // px-4
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 320), // max-w-xs
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Image.asset(
                  'assets/images/get_started.png',
                  height: 256, // w-64 h-64
                  width: 256,
                  fit: BoxFit.contain,
                ),
                const SizedBox(height: 16), // mb-4
                const GradientText(
                  'Urban Steam Captain',
                  align: TextAlign.center,
                  style: TextStyle(
                    fontFamily: Brand.heading,
                    fontSize: Brand.h1, // <h1> // text-3xl
                    fontWeight: FontWeight.w700,
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 8), // mb-2
                const GradientText(
                  'Reimagining ironing for the modern India',
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
                  // py-4 (16+16) around text-sm's line box, which Tailwind v4
                  // expresses as a ratio -- so it follows the 12px a button
                  // actually gets, not the 14 the class asks for.
                  height: 49,
                  radius: Brand.rXl,
                  fontSize: Brand.buttonText,
                  onPressed: () =>
                      Navigator.of(context).pushNamed('/check-availability'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
