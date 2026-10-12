import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api.dart';

export '../config/api.dart' show absoluteUrl, apiUrl;

/// One decoded response.
///
/// Nearly every route answers `{ success, data?, error? }`, but a couple
/// (`/api/hubs` among them) hand back a bare array, so both shapes have to come
/// through the same door.
class ApiResult {
  ApiResult({required this.ok, this.raw, this.error, this.status});

  final bool ok;
  final Map<String, dynamic>? raw;
  final String? error;
  final int? status;

  /// `data` when the envelope has one, otherwise the whole body.
  Map<String, dynamic> get map {
    final data = raw?['data'];
    if (data is Map<String, dynamic>) return data;
    return raw ?? <String, dynamic>{};
  }

  List<dynamic> get list {
    final data = raw?['data'];
    if (data is List) return data;
    final items = raw?['items'];
    if (items is List) return items;
    return const [];
  }
}

/// Every call the Captain app makes, in one place.
///
/// The web app writes its `fetch` inline in each screen, which is why the same
/// endpoint is spelled four different ways across the codebase. Gathering them
/// here is the one structural liberty this port takes; the requests themselves
/// are unchanged, because the backend is shared with the live apps and has to
/// keep answering the old ones.
class Api {
  Api._();

  static const _timeout = Duration(seconds: 20);
  static const _headers = {'Content-Type': 'application/json'};

  static Future<ApiResult> _send(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final uri = Uri.parse('$apiUrl$path');
    try {
      late http.Response response;
      switch (method) {
        case 'GET':
          response = await http.get(uri).timeout(_timeout);
        case 'POST':
          response = await http
              .post(uri, headers: _headers, body: jsonEncode(body ?? {}))
              .timeout(_timeout);
        case 'PUT':
          response = await http
              .put(uri, headers: _headers, body: jsonEncode(body ?? {}))
              .timeout(_timeout);
        case 'PATCH':
          response = await http
              .patch(uri, headers: _headers, body: jsonEncode(body ?? {}))
              .timeout(_timeout);
        case 'DELETE':
          response =
              await http.delete(uri, headers: _headers).timeout(_timeout);
        default:
          return ApiResult(ok: false, error: 'Unsupported method $method');
      }

      final decoded = response.body.isEmpty ? null : jsonDecode(response.body);

      // A bare array is still a success; wrap it so callers see one shape.
      if (decoded is List) {
        return ApiResult(
          ok: response.statusCode >= 200 && response.statusCode < 300,
          raw: {'success': true, 'data': decoded},
          status: response.statusCode,
        );
      }

      final raw =
          decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
      final httpOk = response.statusCode >= 200 && response.statusCode < 300;
      // `success: false` with a 200 is common here, so both have to be checked.
      final ok = httpOk && raw['success'] != false;
      return ApiResult(
        ok: ok,
        raw: raw,
        status: response.statusCode,
        error: (raw['error'] ?? raw['message'])?.toString(),
      );
    } catch (e) {
      return ApiResult(ok: false, error: 'Network error. Please try again.');
    }
  }

  // ---- auth -------------------------------------------------------------

  static Future<ApiResult> sendOtp(String phone) =>
      _send('POST', '/api/auth/send-otp', body: {'phone': phone});

  static Future<ApiResult> verifyOtp(String phone, String code) => _send(
        'POST',
        '/api/auth/verify-otp',
        body: {'phone': phone, 'code': code, 'role': 'partner'},
      );

  /// Finds or creates the partner behind a mobile number. The web app posts
  /// `name: "Partner"` as a placeholder for a brand new one; keeping that means
  /// a half-finished signup looks the same in the admin panel as it does today.
  static Future<ApiResult> findOrCreatePartner(String mobile) => _send(
        'POST',
        '/api/mobile/partners',
        body: {'mobile': mobile, 'name': 'Partner'},
      );

  static Future<ApiResult> googleLogin(String idToken) => _send(
        'POST',
        '/api/auth/google-login',
        body: {'idToken': idToken, 'role': 'partner'},
      );

  // ---- partner ----------------------------------------------------------

  static Future<ApiResult> partner(String partnerId) =>
      _send('GET', '/api/mobile/partners/$partnerId');

  /// The profile screens read the partner through the query form of the route
  /// rather than the path form. Both exist on the server and they do not
  /// return quite the same shape, so each caller keeps the one it had.
  static Future<ApiResult> partnerByQuery(String partnerId) =>
      _send('GET', '/api/mobile/partners?partnerId=$partnerId');

  /// Profile creation saves with PUT; the later edit screens use PATCH.
  static Future<ApiResult> putPartner(
    String partnerId,
    Map<String, dynamic> body,
  ) =>
      _send('PUT', '/api/mobile/partners/$partnerId', body: body);

  static Future<ApiResult> updatePartner(
    String partnerId,
    Map<String, dynamic> body,
  ) =>
      _send('PATCH', '/api/mobile/partners/$partnerId', body: body);

  static Future<ApiResult> submitKyc(
    String partnerId,
    Map<String, dynamic> body,
  ) =>
      _send('POST', '/api/mobile/partners/kyc/$partnerId', body: body);

  // ---- orders -----------------------------------------------------------

  /// Orders for one captain. The web app also calls `/api/orders` with no
  /// filter in a few places, which returns every order in the system with the
  /// customers' names and phone numbers in it; this asks for the captain's own.
  static Future<ApiResult> ordersForPartner(String partnerId) =>
      _send('GET', '/api/orders?partnerId=$partnerId');

  /// The pickup pool: orders nobody has claimed yet. There is no server-side
  /// filter for that, so this is the one place the unfiltered list is needed.
  static Future<ApiResult> allOrders() => _send('GET', '/api/orders');

  /// What the order monitor polls: this captain's orders plus the unclaimed
  /// ones in their pincodes, rather than every order in the database.
  static Future<ApiResult> ordersInScope(String partnerId) =>
      _send('GET', '/api/orders?partnerScope=$partnerId');

  static Future<ApiResult> order(String id) => _send('GET', '/api/orders/$id');

  static Future<ApiResult> patchOrder(String id, Map<String, dynamic> body) =>
      _send('PATCH', '/api/orders/$id', body: body);

  // ---- config -----------------------------------------------------------

  static Future<ApiResult> orderCharges() => _send('GET', '/api/order-charges');

  static Future<ApiResult> hubs() => _send('GET', '/api/hubs');

  /// The hub serving a pincode. The drop screen asks for this first and only
  /// falls back to any active hub when it finds nothing.
  static Future<ApiResult> hubsForPincode(String pincode) =>
      _send('GET', '/api/hubs?pincode=$pincode');

  static Future<ApiResult> checkServiceable(String pincode) =>
      _send('GET', '/api/check-serviceable?pincode=$pincode');

  static Future<ApiResult> notifications(String partnerId) => _send(
        'GET',
        '/api/mobile/notifications?audience=partners&partnerId=$partnerId',
      );
}
