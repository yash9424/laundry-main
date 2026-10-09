import 'dart:async';

import 'package:flutter/material.dart';

import '../services/api.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/common.dart';

/// customer/src/pages/VerifyMobile.tsx
///
/// Six boxes and an on-screen keypad; the system keyboard is never used here.
class VerifyMobileScreen extends StatefulWidget {
  const VerifyMobileScreen({super.key, required this.mobileNumber});

  final String mobileNumber;

  @override
  State<VerifyMobileScreen> createState() => _VerifyMobileScreenState();
}

class _VerifyMobileScreenState extends State<VerifyMobileScreen> {
  final List<String> _otp = List.filled(6, '');
  int _resendIn = 60;
  Timer? _ticker;

  // An OTP is single use: the server deletes it the moment it verifies. A
  // second tap while the first request is still running used to come back as
  // "OTP expired" even though the login had just succeeded.
  bool _verifying = false;

  String get _display =>
      widget.mobileNumber.isEmpty ? 'XXXXXXXXX' : widget.mobileNumber;

  @override
  void initState() {
    super.initState();
    _startTicker();
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  void _startTicker() {
    _ticker?.cancel();
    _ticker = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return t.cancel();
      if (_resendIn <= 0) return t.cancel();
      setState(() => _resendIn--);
    });
  }

  void _press(String digit) {
    final i = _otp.indexOf('');
    if (i == -1) return;
    setState(() => _otp[i] = digit);
  }

  void _backspace() {
    for (var i = _otp.length - 1; i >= 0; i--) {
      if (_otp[i].isNotEmpty) {
        setState(() => _otp[i] = '');
        return;
      }
    }
  }

  Future<void> _resend() async {
    final result = await Api.sendOtp('+91${widget.mobileNumber}');
    if (!mounted) return;
    if (result.ok) {
      setState(() => _resendIn = 60);
      _startTicker();
      showToast(context, 'OTP resent successfully');
    } else {
      showToast(context, result.error ?? 'Failed to resend OTP', error: true);
    }
  }

  Future<void> _verify() async {
    if (_verifying || _otp.any((d) => d.isEmpty)) return;
    setState(() => _verifying = true);

    final code = _otp.join();
    final verified = await Api.verifyOtp('+91${widget.mobileNumber}', code);
    if (!mounted) return;

    if (!verified.ok) {
      setState(() {
        _verifying = false;
        for (var i = 0; i < _otp.length; i++) {
          _otp[i] = '';
        }
      });
      showToast(context, verified.error ?? 'Invalid OTP', error: true);
      return;
    }

    // The code was right. Now find or create the account.
    final account = await Api.mobileLogin(widget.mobileNumber);
    if (!mounted) return;
    setState(() => _verifying = false);

    if (!account.ok) {
      // Saying so beats leaving the button looking dead, which is what the
      // first version of this screen did.
      showToast(
        context,
        account.error ?? 'We could not open your account. Please try again.',
        error: true,
      );
      return;
    }

    final data = account.map;
    final customer = data['customer'];
    await Store.signIn(
      customerId: data['customerId'].toString(),
      token: (verified.raw?['token'] ?? '').toString(),
      name: (customer is Map) ? customer['name']?.toString() : null,
      mobile: widget.mobileNumber,
    );

    if (!mounted) return;
    if (data['isExistingUser'] == true) {
      Navigator.of(context).pushNamedAndRemoveUntil('/home', (r) => false);
    } else {
      Navigator.of(context).pushNamedAndRemoveUntil(
        '/create-profile',
        (r) => false,
        arguments: {
          'customerId': data['customerId'].toString(),
          'mobileNumber': widget.mobileNumber,
        },
      );
    }
  }

  /// h-12 w-10, rounded-xl, border-2 border-blue-500, text-xl semibold
  Widget _box(String digit) {
    return Container(
      height: 48,
      width: 40,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Brand.rXl),
        border: Border.all(color: Brand.blue500, width: 2),
      ),
      child: Text(
        digit,
        style: const TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: Colors.black,
        ),
      ),
    );
  }

  /// h-12, rounded-xl, bg-gray-200, text-lg semibold
  Widget _key(String label) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4), // gap-2
        child: Material(
          color: Brand.gray200,
          borderRadius: BorderRadius.circular(Brand.rXl),
          child: InkWell(
            borderRadius: BorderRadius.circular(Brand.rXl),
            onTap: () => _press(label),
            child: SizedBox(
              height: 48,
              child: Center(
                child: Text(
                  label,
                  style: const TextStyle(
                    fontFamily: Brand.heading,
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: Colors.black,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final complete = _otp.every((d) => d.isNotEmpty);
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: const PageHeader('Verify Mobile'),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16), // px-4
            child: Column(
              children: [
                const Text(
                  "We've sent an OTP to",
                  style: TextStyle(color: Brand.gray600, fontSize: 14),
                ),
                const SizedBox(height: 8),
                Text(
                  '+91 $_display',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Colors.black,
                  ),
                ),
                const SizedBox(height: 8),
                GestureDetector(
                  onTap: () => Navigator.of(context).pop(),
                  child: const Text(
                    'Change number',
                    style: TextStyle(
                      color: Brand.blue500,
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                ),
                const SizedBox(height: 24), // mb-6
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    for (var i = 0; i < _otp.length; i++) ...[
                      if (i > 0) const SizedBox(width: 8), // gap-2
                      _box(_otp[i]),
                    ],
                  ],
                ),
                const SizedBox(height: 16), // mb-4
                const Text("Didn't get OTP?",
                    style: TextStyle(color: Brand.gray600, fontSize: 12)),
                if (_resendIn > 0)
                  Text(
                    'Resend in ${_resendIn}s',
                    style: const TextStyle(color: Brand.blue500, fontSize: 12),
                  )
                else
                  GestureDetector(
                    onTap: _resend,
                    child: const Text(
                      'Resend OTP',
                      style: TextStyle(
                        color: Brand.blue500,
                        fontWeight: FontWeight.w600,
                        fontSize: 12,
                      ),
                    ),
                  ),
                const SizedBox(height: 24), // mb-6
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 384), // max-w-sm
                  child: GradientButton(
                    label: _verifying ? 'Verifying...' : 'Verify & Continue',
                    busy: _verifying,
                    height: 44, // size="lg"
                    radius: Brand.r2xl,
                    fontSize: 16,
                    onPressed: complete && !_verifying ? _verify : null,
                  ),
                ),
                const SizedBox(height: 24), // mb-6
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 320), // max-w-xs
                  child: Column(
                    children: [
                      Row(
                        children: [
                          for (final n in ['1', '2', '3', '4', '5']) _key(n),
                        ],
                      ),
                      const SizedBox(height: 8), // space-y-2
                      Row(
                        children: [
                          for (final n in ['6', '7', '8', '9', '0']) _key(n),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Material(
                        color: Brand.gray800,
                        borderRadius: BorderRadius.circular(Brand.rXl),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(Brand.rXl),
                          onTap: _backspace,
                          child: const SizedBox(
                            height: 48,
                            width: 48,
                            child: Center(
                              child: Text(
                                '✕',
                                style:
                                    TextStyle(color: Colors.white, fontSize: 16),
                              ),
                            ),
                          ),
                        ),
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
