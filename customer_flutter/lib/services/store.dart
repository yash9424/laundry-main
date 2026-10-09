import 'dart:async';
import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Stands in for the web app's localStorage.
///
/// The Capacitor build kept everything in the WebView's localStorage, which a
/// Flutter build cannot read. So the first launch after this update finds an
/// empty store and the customer signs in again -- there is no way around that,
/// it is the cost of leaving the WebView behind. Everything below uses the same
/// key names as before so the code reads the same as the screens it replaces.
class Store {
  Store._();
  static SharedPreferences? _p;

  static Future<void> init() async {
    _p ??= await SharedPreferences.getInstance();
  }

  static SharedPreferences get _prefs {
    final p = _p;
    if (p == null) {
      throw StateError('Store.init() must run before the first read');
    }
    return p;
  }

  // ---- raw access, mirroring getItem/setItem/removeItem -------------------

  static String? getString(String key) => _prefs.getString(key);

  static Future<void> setString(String key, String value) =>
      _prefs.setString(key, value);

  static Future<void> remove(String key) => _prefs.remove(key);

  static int getInt(String key, [int fallback = 0]) {
    final raw = _prefs.getString(key);
    if (raw == null) return fallback;
    return int.tryParse(raw) ?? fallback;
  }

  static double getDouble(String key, [double fallback = 0]) {
    final raw = _prefs.getString(key);
    if (raw == null) return fallback;
    return double.tryParse(raw) ?? fallback;
  }

  /// Reads a JSON value, returning null rather than throwing on anything
  /// unparseable -- a half-written cache should never stop a screen opening.
  static dynamic getJson(String key) {
    final raw = _prefs.getString(key);
    if (raw == null || raw.isEmpty) return null;
    try {
      return jsonDecode(raw);
    } catch (_) {
      return null;
    }
  }

  static Future<void> setJson(String key, Object? value) =>
      _prefs.setString(key, jsonEncode(value));

  // ---- the keys the app actually uses ------------------------------------

  static const kCustomerId = 'customerId';
  static const kAuthToken = 'authToken';
  static const kUserName = 'userName';
  static const kUserMobile = 'userMobile';
  static const kCustomerMobile = 'customerMobile';
  static const kCartItems = 'cartItems';
  static const kDeliveryType = 'selectedDeliveryType';
  static const kCachedAddress = 'cachedAddress';
  static const kCachedBookingAddress = 'cachedBookingAddress';
  static const kCachedProfile = 'cachedProfile';
  static const kCachedSavedAddresses = 'cachedSavedAddresses';
  static const kCachedWalletBalance = 'cachedWalletBalance';
  static const kNotifications = 'customer_notifications';
  static const kReadNotifications = 'read_notifications';
  static const kDeletedNotifications = 'deleted_notifications';
  static const kPushedNotifications = 'pushed_notifications';

  static String? get customerId {
    final id = getString(kCustomerId);
    return (id == null || id.isEmpty) ? null : id;
  }

  static String? get authToken {
    final t = getString(kAuthToken);
    return (t == null || t.isEmpty) ? null : t;
  }

  static bool get isSignedIn => customerId != null && authToken != null;

  static String get userName => getString(kUserName) ?? '';

  /// Broadcast so a screen can react the moment the signed-in user changes,
  /// which is what the web app used its `userNameChanged` window event for.
  static final _authChanges = StreamController<String?>.broadcast();
  static Stream<String?> get authChanges => _authChanges.stream;

  static Future<void> signIn({
    required String customerId,
    required String token,
    String? name,
    String? mobile,
  }) async {
    await setString(kCustomerId, customerId);
    await setString(kAuthToken, token);
    if (name != null) await setString(kUserName, name);
    if (mobile != null) await setString(kCustomerMobile, mobile);
    _authChanges.add(customerId);
  }

  static Future<void> setUserName(String name) async {
    await setString(kUserName, name);
    _authChanges.add(customerId);
  }

  /// Clears this user's session and their cached copies of personal data.
  /// Deliberately leaves nothing of one account behind for the next.
  static Future<void> signOut() async {
    for (final key in [
      kCustomerId,
      kAuthToken,
      kUserName,
      kUserMobile,
      kCustomerMobile,
      kCartItems,
      kCachedAddress,
      kCachedBookingAddress,
      kCachedProfile,
      kCachedSavedAddresses,
      kCachedWalletBalance,
      kNotifications,
      kReadNotifications,
      kDeletedNotifications,
      kPushedNotifications,
    ]) {
      await remove(key);
    }
    _authChanges.add(null);
  }
}
