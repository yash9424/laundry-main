import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/api.dart';
import '../theme/brand.dart';
import '../widgets/common.dart';

/// customer/src/pages/CheckAvailability.tsx
///
/// The viewport is about 411 CSS px wide, which is below Tailwind's `sm`
/// breakpoint, so only the base classes apply -- every `sm:` value in the
/// original is dead code on a phone. The sizes below are those base values.
class CheckAvailabilityScreen extends StatefulWidget {
  const CheckAvailabilityScreen({super.key});

  @override
  State<CheckAvailabilityScreen> createState() =>
      _CheckAvailabilityScreenState();
}

class _CheckAvailabilityScreenState extends State<CheckAvailabilityScreen> {
  final _pincode = TextEditingController();
  bool _checking = false;

  @override
  void dispose() {
    _pincode.dispose();
    super.dispose();
  }

  Future<void> _check() async {
    if (_pincode.text.length != 6 || _checking) return;
    setState(() => _checking = true);
    final serviceable = await Api.isServiceable(_pincode.text);
    if (!mounted) return;
    setState(() => _checking = false);
    Navigator.of(context).pushNamed(serviceable ? '/congrats' : '/not-available');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Brand.background,
      // No back control: the screen's own header is just a centred title.
      appBar: const PageHeader(
        'Check Availability',
        centred: true,
        showBack: false,
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // w-72 h-72 object-contain
                Image.asset(
                  'assets/images/pincode_check.png',
                  width: 288,
                  height: 288,
                  fit: BoxFit.contain,
                ),
                const SizedBox(height: 16), // mb-4
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16), // px-4
                  child: Text(
                    'Enter your area pincode to check\nservice availability',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Brand.mutedForeground,
                      fontWeight: FontWeight.w600, // font-semibold
                      fontSize: 14, // text-sm
                      height: 1.4,
                    ),
                  ),
                ),
                const SizedBox(height: 16), // mb-4
                ConstrainedBox(
                  // w-full max-w-sm
                  constraints: const BoxConstraints(maxWidth: 384),
                  child: Column(
                    children: [
                      SizedBox(
                        height: 40, // h-10
                        child: TextField(
                          controller: _pincode,
                          keyboardType: TextInputType.number,
                          textAlign: TextAlign.center,
                          maxLength: 6,
                          style: const TextStyle(fontSize: 16), // text-base
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                            LengthLimitingTextInputFormatter(6),
                          ],
                          decoration: InputDecoration(
                            hintText: 'Pincode',
                            counterText: '',
                            isDense: false,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                            // rounded-xl border-input
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(Brand.rXl),
                              borderSide: const BorderSide(color: Brand.input),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(Brand.rXl),
                              borderSide:
                                  const BorderSide(color: Brand.primary, width: 2),
                            ),
                          ),
                          onChanged: (_) => setState(() {}),
                          onSubmitted: (_) => _check(),
                        ),
                      ),
                      const SizedBox(height: 16), // space-y-4
                      GradientButton(
                        label: 'Check Availability',
                        busy: _checking,
                        height: 44, // size="lg" -> h-11
                        radius: Brand.r2xl,
                        fontSize: 16, // text-base
                        onPressed: _pincode.text.length == 6 ? _check : null,
                      ),
                    ],
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
