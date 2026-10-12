import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/api.dart';
import '../theme/brand.dart';
import '../widgets/common.dart';

/// `app/check-availability/page.tsx`.
///
/// Asks the server whether a pincode is served and sends the captain to the
/// congratulations or the sorry screen. A failed request counts as "not
/// available" in the web app, and that is kept: it is the safer answer.
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
    final result = await Api.checkServiceable(_pincode.text);
    if (!mounted) return;
    setState(() => _checking = false);

    final serviceable = result.raw?['serviceable'] == true;
    Navigator.of(context)
        .pushNamed(serviceable ? '/congrats' : '/not-available');
  }

  @override
  Widget build(BuildContext context) {
    final ready = _pincode.text.length == 6;
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: const AppHeader(title: 'Check Availability'),
      body: WebCentre(
        above: 48,
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Image.asset(
                'assets/images/pincode_check.png',
                // 412x392 asset + preflight's `height: auto`: 288 wide, 274 tall.
                width: 288,
                fit: BoxFit.contain,
              ),
              const SizedBox(height: 24), // mb-6
              const Text(
                'Enter your area pincode to check\nservice availability',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Brand.gray500,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 32), // mb-8
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 448), // max-w-md
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextField(
                      controller: _pincode,
                      keyboardType: TextInputType.phone,
                      textAlign: TextAlign.center,
                      maxLength: 6,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        LengthLimitingTextInputFormatter(6),
                      ],
                      onChanged: (_) => setState(() {}),
                      onSubmitted: (_) => _check(),
                      style: const TextStyle(fontSize: 18, color: Colors.black),
                      decoration: InputDecoration(
                        hintText: 'Pincode',
                        counterText: '',
                        hintStyle: const TextStyle(color: Brand.gray400),
                        isDense: false,
                        // px-4 py-4
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 16),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(Brand.rXl),
                          borderSide: const BorderSide(color: Brand.gray300),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(Brand.rXl),
                          borderSide:
                              const BorderSide(color: Brand.purple, width: 2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16), // space-y-4
                    GradientButton(
                      label: 'Check Availability',
                      // py-4 around a 12px line: `text-lg` on a <button> is
                      // overruled by globals.css (see Brand.buttonText).
                      height: 50,
                      radius: Brand.rXl,
                      fontSize: Brand.buttonText,
                      busy: _checking,
                      onPressed: ready ? _check : null,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
