import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api.dart';

/// What every route in `admin panel/app/api` returns:
/// `{ success: bool, data?: ..., error?/message?: ... }`.
class ApiResult {
  const ApiResult({
    required this.ok,
    this.data,
    this.error,
    this.statusCode,
    this.raw,
  });

  final bool ok;
  final dynamic data;
  final String? error;
  final int? statusCode;
  final Map<String, dynamic>? raw;

  List<dynamic> get list => data is List ? data as List : const [];

  Map<String, dynamic> get map =>
      data is Map<String, dynamic> ? data as Map<String, dynamic> : const {};
}

/// Every call the customer app makes, in one place.
///
/// The web app wrote fetch inline in each screen; collecting them here means a
/// payload is described once. The bodies are exactly what the server already
/// receives, because the backend is shared with the admin panel and the partner
/// app and trusts what it is sent.
class Api {
  Api._();

  static const Duration _timeout = Duration(seconds: 20);
  static const Map<String, String> _json = {'Content-Type': 'application/json'};

  static Uri _uri(String path, [Map<String, dynamic>? query]) {
    final q = query?.entries
        .where((e) => e.value != null)
        .map((e) =>
            '${Uri.encodeQueryComponent(e.key)}=${Uri.encodeQueryComponent(e.value.toString())}')
        .join('&');
    return Uri.parse('$apiUrl$path${(q == null || q.isEmpty) ? '' : '?$q'}');
  }

  static ApiResult _parse(http.Response r) {
    dynamic body;
    try {
      body = jsonDecode(r.body);
    } catch (_) {
      return ApiResult(
        ok: false,
        error: 'Server sent something we could not read.',
        statusCode: r.statusCode,
      );
    }

    // A couple of routes answer with a bare array instead of the envelope.
    if (body is List) {
      return ApiResult(
        ok: r.statusCode < 400,
        data: body,
        statusCode: r.statusCode,
      );
    }
    if (body is Map<String, dynamic>) {
      return ApiResult(
        ok: body['success'] == true,
        data: body['data'],
        error: (body['error'] ?? body['message'])?.toString(),
        statusCode: r.statusCode,
        raw: body,
      );
    }
    return ApiResult(
      ok: false,
      error: 'Unexpected reply.',
      statusCode: r.statusCode,
    );
  }

  static ApiResult _failure(Object e) {
    if (e is TimeoutException) {
      return const ApiResult(
        ok: false,
        error: 'The request timed out. Please try again.',
      );
    }
    return const ApiResult(
      ok: false,
      error: 'Network error. Please check your connection.',
    );
  }

  static Future<ApiResult> _send(
    String method,
    String path, {
    Map<String, dynamic>? query,
    Object? body,
    Duration? timeout,
  }) async {
    try {
      final uri = _uri(path, query);
      final encoded = body == null ? null : jsonEncode(body);
      final t = timeout ?? _timeout;
      late http.Response r;
      switch (method) {
        case 'GET':
          r = await http.get(uri).timeout(t);
          break;
        case 'POST':
          r = await http.post(uri, headers: _json, body: encoded).timeout(t);
          break;
        case 'PUT':
          r = await http.put(uri, headers: _json, body: encoded).timeout(t);
          break;
        case 'PATCH':
          r = await http.patch(uri, headers: _json, body: encoded).timeout(t);
          break;
        case 'DELETE':
          r = await http.delete(uri, headers: _json, body: encoded).timeout(t);
          break;
        default:
          throw ArgumentError(method);
      }
      return _parse(r);
    } catch (e) {
      return _failure(e);
    }
  }

  // ---- availability ------------------------------------------------------

  /// Answers `{ serviceable: true|false }` -- this one is NOT the usual envelope.
  static Future<bool> isServiceable(String pincode) async {
    try {
      final r = await http
          .get(_uri('/api/check-serviceable', {'pincode': pincode}))
          .timeout(_timeout);
      final body = jsonDecode(r.body);
      return body is Map && body['serviceable'] == true;
    } catch (_) {
      return false;
    }
  }

  static Future<ApiResult> pincodeLookup(String pincode) =>
      _send('GET', '/api/locations/pincodes', query: {'pincode': pincode});

  // ---- auth --------------------------------------------------------------

  static Future<ApiResult> sendOtp(String phone) =>
      _send('POST', '/api/auth/send-otp', body: {'phone': phone});

  static Future<ApiResult> verifyOtp(String phone, String code) => _send(
        'POST',
        '/api/auth/verify-otp',
        body: {'phone': phone, 'code': code, 'role': 'customer'},
      );

  /// Finds or creates the customer for a mobile number.
  static Future<ApiResult> mobileLogin(String mobile) =>
      _send('POST', '/api/mobile/auth/login', body: {'mobile': mobile});

  static Future<ApiResult> googleLogin(String idToken) => _send(
        'POST',
        '/api/auth/google-login',
        body: {'idToken': idToken, 'role': 'customer'},
      );

  static Future<ApiResult> appleLogin(String identityToken) => _send(
        'POST',
        '/api/auth/apple-login',
        body: {'identityToken': identityToken, 'role': 'customer'},
      );

  // ---- profile -----------------------------------------------------------

  static Future<ApiResult> profile(String customerId, {Duration? timeout}) =>
      _send('GET', '/api/mobile/profile',
          query: {'customerId': customerId}, timeout: timeout);

  static Future<ApiResult> saveProfile(
    String customerId,
    Map<String, dynamic> fields,
  ) =>
      _send('PUT', '/api/mobile/profile',
          query: {'customerId': customerId}, body: fields);

  /// Addresses and payment methods POST rather than PUT.
  static Future<ApiResult> postProfile(
    String customerId,
    Map<String, dynamic> fields,
  ) =>
      _send('POST', '/api/mobile/profile',
          query: {'customerId': customerId}, body: fields);

  static Future<ApiResult> patchCustomer(
    String customerId,
    Map<String, dynamic> fields,
  ) =>
      _send('PATCH', '/api/customers/$customerId', body: fields);

  // ---- catalogue and settings -------------------------------------------

  static Future<ApiResult> pricingCategories() =>
      _send('GET', '/api/pricing/categories');

  static Future<ApiResult> pricingItems() => _send('GET', '/api/pricing');

  static Future<ApiResult> orderCharges() => _send('GET', '/api/order-charges');

  static Future<ApiResult> walletSettings() =>
      _send('GET', '/api/wallet-settings');

  static Future<ApiResult> heroSection() => _send('GET', '/api/hero-section');

  static Future<ApiResult> vouchers() => _send('GET', '/api/vouchers');

  static Future<ApiResult> timeSlots({
    int? dayOffset,
    String? serviceType,
    String? day,
  }) =>
      _send('GET', '/api/time-slots', query: {
        if (dayOffset != null) 'dayOffset': dayOffset,
        if (serviceType != null) 'serviceType': serviceType,
        if (day != null) 'day': day,
      });

  // ---- orders ------------------------------------------------------------

  static Future<ApiResult> myOrders(String customerId) =>
      _send('GET', '/api/orders', query: {'customerId': customerId});

  static Future<ApiResult> order(String id) => _send('GET', '/api/orders/$id');

  static Future<ApiResult> createOrder(Map<String, dynamic> order) => _send(
        'POST',
        '/api/orders',
        body: order,
        timeout: const Duration(seconds: 45),
      );

  static Future<ApiResult> patchOrder(String id, Map<String, dynamic> fields) =>
      _send('PATCH', '/api/orders/$id', body: fields);

  static Future<ApiResult> reviewOrder(
    String id, {
    required int rating,
    required String comment,
    required String customerId,
  }) =>
      _send('POST', '/api/orders/$id/review', body: {
        'rating': rating,
        'comment': comment,
        'customerId': customerId,
      });

  /// The assigned captain, so the customer can ring them.
  static Future<ApiResult> partner(String partnerId) =>
      _send('GET', '/api/mobile/partners/$partnerId');

  // ---- wallet, plans, notifications -------------------------------------

  static Future<ApiResult> walletTransactions(String customerId) =>
      _send('GET', '/api/wallet-transactions',
          query: {'customerId': customerId});

  static Future<ApiResult> subscriptionPlans() =>
      _send('GET', '/api/subscription-plans');

  static Future<ApiResult> mySubscriptions(String customerId) =>
      _send('GET', '/api/subscriptions', query: {'customerId': customerId});

  static Future<ApiResult> createSubscription(Map<String, dynamic> body) =>
      _send('POST', '/api/subscriptions', body: body);

  static Future<ApiResult> notifications(String customerId) =>
      _send('GET', '/api/mobile/notifications',
          query: {'audience': 'customers', 'customerId': customerId});

  // ---- payments ----------------------------------------------------------

  static Future<ApiResult> razorpayCreateOrder({
    required num amount,
    String currency = 'INR',
    String? receipt,
  }) =>
      _send('POST', '/api/razorpay/create-order', body: {
        'amount': amount,
        'currency': currency,
        'receipt': receipt ?? 'rcpt_${DateTime.now().millisecondsSinceEpoch}',
      });

  static Future<ApiResult> razorpayVerify({
    required String orderId,
    required String paymentId,
    required String signature,
  }) =>
      _send('POST', '/api/razorpay/verify-payment', body: {
        'razorpay_order_id': orderId,
        'razorpay_payment_id': paymentId,
        'razorpay_signature': signature,
      });
}
