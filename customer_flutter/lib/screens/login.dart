import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

import '../services/api.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/common.dart';

/// The Google web client ID (GOOGLE_CLIENT_ID on the server). Asking for an ID
/// token with this audience is what makes /api/auth/google-login accept it --
/// the route checks the token against exactly this list of client IDs.
const _googleServerClientId =
    '514222866895-c11vn2eb5u15hi6d5ib0eb4d10cdo3oq.apps.googleusercontent.com';

/// The same four paths the web screen inlines for the Google mark.
const _googleMark = '''
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
</svg>
''';

/// customer/src/pages/Login.tsx
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _mobile = TextEditingController();
  bool _sending = false;
  bool _social = false;

  bool get _isIos => Platform.isIOS;

  @override
  void dispose() {
    _mobile.dispose();
    super.dispose();
  }

  Future<void> _sendOtp() async {
    if (_mobile.text.length != 10 || _sending) return;
    setState(() => _sending = true);
    final result = await Api.sendOtp('+91${_mobile.text}');
    if (!mounted) return;
    setState(() => _sending = false);

    if (result.ok) {
      await Store.setString(Store.kUserMobile, _mobile.text);
      if (!mounted) return;
      Navigator.of(context).pushNamed(
        '/verify-mobile',
        arguments: {'mobileNumber': _mobile.text},
      );
    } else {
      showToast(context, result.error ?? 'Failed to send OTP', error: true);
    }
  }

  /// Both social paths end the same way: the server hands back a customerId
  /// and a token, and a brand new account goes to the profile screen first.
  Future<void> _finishSocial(ApiResult result) async {
    if (!mounted) return;
    if (!result.ok) {
      showToast(context, result.error ?? 'Sign-in failed', error: true);
      return;
    }
    final data = result.map;
    await Store.signIn(
      customerId: data['customerId'].toString(),
      token: (result.raw?['token'] ?? '').toString(),
      name: (data['customer'] is Map) ? data['customer']['name']?.toString() : null,
    );
    if (!mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil(
      data['isNewUser'] == true ? '/create-profile' : '/home',
      (r) => false,
    );
  }

  Future<void> _google() async {
    if (_social) return;
    setState(() => _social = true);
    try {
      final google = GoogleSignIn(
        scopes: const ['email', 'profile'],
        serverClientId: _googleServerClientId,
      );
      // Sign out first so a second attempt can pick a different account rather
      // than silently reusing the last one.
      await google.signOut();
      final account = await google.signIn();
      if (account == null) {
        if (mounted) setState(() => _social = false);
        return; // the person backed out; not an error
      }
      final auth = await account.authentication;
      final idToken = auth.idToken;
      if (idToken == null || idToken.isEmpty) {
        if (mounted) {
          showToast(context, 'Google did not return a token. Please try again.',
              error: true);
        }
        return;
      }
      await _finishSocial(await Api.googleLogin(idToken));
    } catch (_) {
      if (mounted) showToast(context, 'Google Sign-In error', error: true);
    } finally {
      if (mounted) setState(() => _social = false);
    }
  }

  Future<void> _apple() async {
    if (_social) return;
    setState(() => _social = true);
    try {
      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: const [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
      );
      final token = credential.identityToken;
      if (token == null || token.isEmpty) {
        if (mounted) {
          showToast(context, 'Authentication failed. Please try again.',
              error: true);
        }
        return;
      }
      await _finishSocial(await Api.appleLogin(token));
    } on SignInWithAppleAuthorizationException catch (e) {
      // Cancelling is not a failure worth a message, same as before.
      if (e.code != AuthorizationErrorCode.canceled && mounted) {
        showToast(context, 'Apple Sign-In error', error: true);
      }
    } catch (_) {
      if (mounted) showToast(context, 'Apple Sign-In error', error: true);
    } finally {
      if (mounted) setState(() => _social = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24), // px-4 pt-4 pb-6
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Align(
                alignment: Alignment.centerLeft, // self-start
                child: Text(
                  'Please log in to continue →',
                  style: TextStyle(
                    fontFamily: Brand.heading,
                    fontSize: 24, // text-2xl
                    fontWeight: FontWeight.w700,
                    color: Colors.black,
                  ),
                ),
              ),
              const SizedBox(height: 16), // mb-4
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 320), // max-w-xs
                child: Image.asset(
                  'assets/images/login.png',
                  height: 256, // h-64
                  width: double.infinity,
                  fit: BoxFit.contain,
                ),
              ),
              const SizedBox(height: 16), // mb-4
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 384), // max-w-sm
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Please enter your mobile number :',
                        style: TextStyle(
                          fontSize: 16, // text-base
                          fontWeight: FontWeight.w500,
                          color: Colors.black,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8), // mb-2
                    SizedBox(
                      height: 40, // h-10
                      child: TextField(
                        controller: _mobile,
                        keyboardType: TextInputType.phone,
                        maxLength: 10,
                        style: const TextStyle(fontSize: 14), // text-sm
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(10),
                        ],
                        decoration: InputDecoration(
                          hintText: 'Mobile Number',
                          counterText: '',
                          isDense: false,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          // rounded-xl border-2 border-blue-500
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(Brand.rXl),
                            borderSide: const BorderSide(
                                color: Brand.blue500, width: 2),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(Brand.rXl),
                            borderSide: const BorderSide(
                                color: Brand.blue500, width: 2),
                          ),
                        ),
                        onChanged: (_) => setState(() {}),
                        onSubmitted: (_) => _sendOtp(),
                      ),
                    ),
                    const SizedBox(height: 12), // space-y-3
                    GradientButton(
                      label: 'Log In',
                      busy: _sending,
                      height: 44, // size="lg"
                      radius: Brand.r2xl,
                      fontSize: 16,
                      onPressed: _mobile.text.length == 10 ? _sendOtp : null,
                    ),
                    const SizedBox(height: 16), // my-4
                    Row(
                      children: const [
                        Expanded(child: Divider(color: Brand.gray300)),
                        Padding(
                          padding: EdgeInsets.symmetric(horizontal: 8),
                          child: Text('OR',
                              style: TextStyle(
                                  color: Brand.gray500, fontSize: 14)),
                        ),
                        Expanded(child: Divider(color: Brand.gray300)),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _socialButton(
                      onPressed: _social ? null : _google,
                      icon: SvgPicture.string(_googleMark,
                          width: 20, height: 20),
                      label: 'Continue with Google',
                      background: Colors.white,
                      border: Brand.gray300,
                      foreground: Brand.gray700,
                    ),
                    if (_isIos) ...[
                      const SizedBox(height: 12),
                      _socialButton(
                        onPressed: _social ? null : _apple,
                        icon: const Icon(Icons.apple,
                            size: 20, color: Colors.white),
                        label: 'Sign in with Apple',
                        background: Colors.black,
                        border: Colors.black,
                        foreground: Colors.white,
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Default Button height (h-10), rounded-2xl, border-2, text-base semibold.
  Widget _socialButton({
    required VoidCallback? onPressed,
    required Widget icon,
    required String label,
    required Color background,
    required Color border,
    required Color foreground,
  }) {
    return SizedBox(
      height: 40,
      child: Material(
        color: background,
        borderRadius: BorderRadius.circular(Brand.r2xl),
        elevation: 2,
        shadowColor: Colors.black26,
        child: InkWell(
          borderRadius: BorderRadius.circular(Brand.r2xl),
          onTap: onPressed,
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(Brand.r2xl),
              border: Border.all(color: border, width: 2),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                icon,
                const SizedBox(width: 8), // gap-2
                Text(
                  label,
                  style: TextStyle(
                    fontFamily: Brand.heading,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: foreground,
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
