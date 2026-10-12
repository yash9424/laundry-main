import 'dart:async';

import 'package:shared_preferences/shared_preferences.dart';

/// Everything the Capacitor build kept in the WebView's localStorage.
///
/// The Captain app only ever stored four keys, and they keep their names here
/// so the two builds describe the same thing. What a Flutter build cannot do is
/// *read* what the WebView wrote: the storage belongs to the webview, not the
/// app, so the first launch after this update signs every captain out. That is
/// unavoidable and is called out in the README.
///
/// `useAuthId` in the web app watched localStorage on a timer so the order
/// monitor would follow a sign-in without an app restart. [authChanges] is the
/// same idea done properly -- a stream, pushed to on sign-in and sign-out.
class Store {
  Store._();

  static const kPartnerId = 'partnerId';
  static const kAuthToken = 'authToken';
  static const kPartnerMobile = 'partnerMobile';
  static const kNotifications = 'partner_notifications';

  static late SharedPreferences _prefs;
  static final _auth = StreamController<String?>.broadcast();

  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  /// Emits the signed-in partner id, or null on sign-out.
  static Stream<String?> get authChanges => _auth.stream;

  static String? get partnerId {
    final id = _prefs.getString(kPartnerId);
    return (id == null || id.isEmpty) ? null : id;
  }

  static String? get authToken => _prefs.getString(kAuthToken);
  static String? get partnerMobile => _prefs.getString(kPartnerMobile);
  static bool get isSignedIn => partnerId != null;

  static Future<void> signIn({
    required String partnerId,
    String? token,
    String? mobile,
  }) async {
    await _prefs.setString(kPartnerId, partnerId);
    if (token != null && token.isNotEmpty) {
      await _prefs.setString(kAuthToken, token);
    }
    if (mobile != null && mobile.isNotEmpty) {
      await _prefs.setString(kPartnerMobile, mobile);
    }
    _auth.add(partnerId);
  }

  /// Signing out drops the stored notifications too. They are this captain's
  /// orders, and leaving them for whoever signs in next on the same phone would
  /// show them another person's pickups.
  static Future<void> signOut() async {
    await _prefs.remove(kPartnerId);
    await _prefs.remove(kAuthToken);
    await _prefs.remove(kPartnerMobile);
    await _prefs.remove(kNotifications);
    _auth.add(null);
  }

  static Future<void> setString(String key, String value) =>
      _prefs.setString(key, value);

  static String? getString(String key) => _prefs.getString(key);

  static Future<void> remove(String key) => _prefs.remove(key);
}
