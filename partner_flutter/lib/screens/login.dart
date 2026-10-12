import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../services/api.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/common.dart';

/// The Google client IDs the Capacitor build initialises GoogleAuth with. The
/// server checks an id token against the web one, so that is what has to be
/// asked for; the Android one is the client this app signs in as.
const _googleServerClientId =
    '514222866895-c11vn2eb5u15hi6d5ib0eb4d10cdo3oq.apps.googleusercontent.com';

/// The same four paths the login screen inlines for the Google mark.
const _googleMark = '''
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
</svg>
''';

/// `app/login/page.tsx`.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _mobile = TextEditingController();
  bool _loading = false;
  bool _social = false;

  @override
  void dispose() {
    _mobile.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (_mobile.text.length != 10) {
      showToast(context, 'Please enter a valid 10-digit mobile number',
          kind: ToastKind.error);
      return;
    }
    setState(() => _loading = true);
    final result = await Api.sendOtp('+91${_mobile.text}');
    if (!mounted) return;
    setState(() => _loading = false);

    if (result.ok) {
      await Store.setString(Store.kPartnerMobile, _mobile.text);
      if (!mounted) return;
      Navigator.of(context).pushNamed('/verify');
    } else {
      showToast(context, result.error ?? 'Failed to send OTP',
          kind: ToastKind.error);
    }
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
        return; // backed out; not an error
      }
      final auth = await account.authentication;
      final idToken = auth.idToken;
      if (idToken == null || idToken.isEmpty) {
        if (mounted) {
          showToast(context, 'Failed to get authentication token from Google',
              kind: ToastKind.error);
        }
        return;
      }

      final result = await Api.googleLogin(idToken);
      if (!mounted) return;
      if (!result.ok) {
        showToast(context, 'Login failed: ${result.error ?? 'Unknown error'}',
            kind: ToastKind.error);
        return;
      }
      final data = result.map;
      await Store.signIn(
        partnerId: data['partnerId'].toString(),
        token: (result.raw?['token'] ?? '').toString(),
      );
      if (!mounted) return;
      Navigator.of(context).pushNamedAndRemoveUntil(
        data['isNewUser'] == true ? '/profile/create' : '/pickups',
        (route) => false,
      );
    } catch (_) {
      if (mounted) {
        showToast(context, 'Google Sign-In Error', kind: ToastKind.error);
      }
    } finally {
      if (mounted) setState(() => _social = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: const AppHeader(title: 'Login'),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.only(bottom: 24), // pb-6
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 24), // pt-6
              // `scooter.svg` is not vector art: it is a raster wrapped in an
              // SVG <pattern> behind a drop-shadow <filter>, which flutter_svg
              // does not draw -- the illustration came out blank. This is the
              // same picture, pulled out of it.
              Center(
                child: Image.asset(
                  'assets/images/scooter.png',
                  width: 220,
                  height: 140,
                  fit: BoxFit.contain,
                ),
              ),
              const SizedBox(height: 16), // mt-4
              const Center(
                child: Text(
                  'Sign in to your account.',
                  style: TextStyle(fontSize: 14, color: Brand.gray500),
                ),
              ),
              const SizedBox(height: 40), // mt-10
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16), // px-4
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Please enter your mobile no :',
                      style: TextStyle(
                        fontSize: 18, // text-lg
                        fontWeight: FontWeight.w500,
                        color: Colors.black,
                      ),
                    ),
                    const SizedBox(height: 12), // mt-3
                    TextField(
                      controller: _mobile,
                      keyboardType: TextInputType.phone,
                      maxLength: 10,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        LengthLimitingTextInputFormatter(10),
                      ],
                      onChanged: (_) => setState(() {}),
                      onSubmitted: (_) => _login(),
                      style: const TextStyle(fontSize: 16, color: Colors.black),
                      decoration: InputDecoration(
                        hintText: 'Enter your phone no',
                        counterText: '',
                        isDense: false,
                        // The person glyph the web app puts inside the field.
                        prefixIcon: const Padding(
                          padding: EdgeInsets.only(left: 12, right: 6),
                          child: Text('\u{1F464}',
                              style:
                                  TextStyle(fontSize: 16, color: Brand.purple)),
                        ),
                        prefixIconConstraints:
                            const BoxConstraints(minWidth: 0, minHeight: 0),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 12), // py-3
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(Brand.rXl),
                          borderSide:
                              const BorderSide(color: Brand.inputBorder),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(Brand.rXl),
                          borderSide:
                              const BorderSide(color: Brand.purple, width: 2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20), // mt-5
                    GradientButton(
                      label: _loading ? 'Logging in...' : 'Login',
                      height: 48, // py-3 around text-base
                      radius: Brand.rXl,
                      busy: _loading,
                      onPressed: _loading ? null : _login,
                    ),
                    const SizedBox(height: 16), // my-4
                    Row(
                      children: [
                        const Expanded(child: Divider(color: Brand.gray300)),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          child: Container(
                            color: Colors.white,
                            child: const Text('OR',
                                style: TextStyle(
                                    fontSize: 14, color: Brand.gray500)),
                          ),
                        ),
                        const Expanded(child: Divider(color: Brand.gray300)),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _googleButton(),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// `border-2 border-gray-300 rounded-xl py-3 shadow-lg`.
  Widget _googleButton() {
    return SizedBox(
      height: 48,
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Brand.rXl),
        elevation: 4,
        shadowColor: Colors.black26,
        child: InkWell(
          borderRadius: BorderRadius.circular(Brand.rXl),
          onTap: _social ? null : _google,
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(Brand.rXl),
              border: Border.all(color: Brand.gray300, width: 2),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SvgPicture.string(_googleMark, width: 20, height: 20),
                const SizedBox(width: 8), // gap-2
                const Text(
                  'Continue with Google',
                  style: TextStyle(
                    fontFamily: Brand.heading,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Brand.gray700,
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
