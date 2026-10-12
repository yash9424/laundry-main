import 'dart:async';

import 'package:flutter/material.dart';

import '../services/api.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/common.dart';

/// `app/verify/page.tsx`.
///
/// Six boxes filled from the app's own keypad -- the web screen never opens the
/// system keyboard, so neither does this. The boxes are display only; digits go
/// in from the grid below and come out with the backspace key.
class VerifyScreen extends StatefulWidget {
  const VerifyScreen({super.key});

  @override
  State<VerifyScreen> createState() => _VerifyScreenState();
}

class _VerifyScreenState extends State<VerifyScreen> {
  final List<String> _otp = List.filled(6, '');
  String _mobile = '';
  bool _loading = false;
  int _countdown = 60;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _mobile = Store.partnerMobile ?? '';
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      if (_countdown <= 0) {
        timer.cancel();
        return;
      }
      setState(() => _countdown--);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  String get _code => _otp.join();
  int get _nextEmpty => _otp.indexOf('');

  void _addDigit(String digit) {
    final index = _otp.indexOf('');
    if (index == -1) return; // full
    setState(() => _otp[index] = digit);
  }

  void _backspace() {
    final index = _otp.lastIndexWhere((d) => d.isNotEmpty);
    if (index < 0) return;
    setState(() => _otp[index] = '');
  }

  Future<void> _verify() async {
    if (_code.length != 6) {
      showToast(context, 'Please enter complete OTP', kind: ToastKind.error);
      return;
    }
    setState(() => _loading = true);

    final verified = await Api.verifyOtp('+91$_mobile', _code);
    if (!mounted) return;

    if (!verified.ok) {
      setState(() {
        _loading = false;
        for (var i = 0; i < _otp.length; i++) {
          _otp[i] = '';
        }
      });
      showToast(context, verified.error ?? 'Invalid OTP. Please try again.',
          kind: ToastKind.error);
      return;
    }

    final partner = await Api.findOrCreatePartner(_mobile);
    if (!mounted) return;
    setState(() => _loading = false);

    if (!partner.ok) {
      showToast(
          context, partner.error ?? 'Verification failed. Please try again.',
          kind: ToastKind.error);
      return;
    }

    final data = partner.map;
    await Store.signIn(
      partnerId: (data['partnerId'] ?? data['_id']).toString(),
      token: (verified.raw?['token'] ?? '').toString(),
      mobile: _mobile,
    );
    if (!mounted) return;

    // An account that already has an email has been through profile creation,
    // so it goes straight to work; anything else finishes signing up first.
    final existing = data['isExistingUser'] == true;
    final partnerRecord = data['partner'];
    final hasEmail = partnerRecord is Map &&
        (partnerRecord['email']?.toString().isNotEmpty ?? false);

    Navigator.of(context).pushNamedAndRemoveUntil(
      existing && hasEmail ? '/pickups' : '/profile/create',
      (route) => false,
    );
  }

  /// `12345XXXXX` -- the first five digits, the rest hidden.
  String get _maskedMobile {
    if (_mobile.length != 10) return _mobile;
    return '${_mobile.substring(0, 5)}XXXXX';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppHeader(
        title: 'Verify Mobile',
        onBack: () => Navigator.of(context).pop(),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.only(bottom: 24),
          child: Column(
            children: [
              const SizedBox(height: 24), // pt-6
              const Text('We’ve sent an OTP to',
                  style: TextStyle(color: Brand.gray500)),
              const SizedBox(height: 4),
              Text(
                '+91 $_maskedMobile',
                style: const TextStyle(
                    color: Colors.black, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 4),
              GestureDetector(
                onTap: () => Navigator.of(context).pop(),
                child: const Text('Change number',
                    style: TextStyle(color: Brand.purple)),
              ),
              const SizedBox(height: 16), // mt-4
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (var i = 0; i < 6; i++) ...[
                    if (i > 0) const SizedBox(width: 12), // gap-3
                    _box(i),
                  ],
                ],
              ),
              const SizedBox(height: 16),
              const Text('Didn’t get OTP?',
                  style: TextStyle(color: Brand.gray500)),
              Text(
                _countdown > 0 ? 'Resend in ${_countdown}s' : 'Resend OTP',
                style: const TextStyle(color: Brand.purple),
              ),
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: GradientButton(
                  label: _loading ? 'Verifying...' : 'Verify & Continue',
                  height: 48,
                  radius: Brand.rXl,
                  busy: _loading,
                  onPressed: _code.length == 6 && !_loading ? _verify : null,
                ),
              ),
              const SizedBox(height: 24), // mt-6
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  children: [
                    _keypadRow(const ['1', '2', '3', '4', '5']),
                    const SizedBox(height: 16),
                    _keypadRow(const ['6', '7', '8', '9', '0']),
                    const SizedBox(height: 16),
                    Center(
                      child: Material(
                        color: Brand.gray200,
                        borderRadius: BorderRadius.circular(Brand.rXl),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(Brand.rXl),
                          onTap: _backspace,
                          child: const Padding(
                            padding: EdgeInsets.symmetric(
                                horizontal: 32, vertical: 16),
                            child: Text(
                              '⌫',
                              style: TextStyle(
                                fontFamily: Brand.heading,
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: Colors.black,
                              ),
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
    );
  }

  /// `h-14 w-14 rounded-2xl border-2`, with the next empty one outlined purple.
  Widget _box(int index) {
    final isNext = index == _nextEmpty;
    return Container(
      height: 56,
      width: 56,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(Brand.r2xl),
        border: Border.all(
          color: isNext ? Brand.purple : Brand.gray300,
          width: 2,
        ),
      ),
      child: Text(
        _otp[index],
        style: const TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: Colors.black,
        ),
      ),
    );
  }

  Widget _keypadRow(List<String> digits) {
    return Row(
      children: [
        for (var i = 0; i < digits.length; i++) ...[
          if (i > 0) const SizedBox(width: 16), // gap-4
          Expanded(
            child: Material(
              color: Brand.gray100,
              borderRadius: BorderRadius.circular(Brand.rXl),
              child: InkWell(
                borderRadius: BorderRadius.circular(Brand.rXl),
                onTap: () => _addDigit(digits[i]),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12), // py-3
                  child: Text(
                    digits[i],
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontFamily: Brand.heading,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Colors.black,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
}
