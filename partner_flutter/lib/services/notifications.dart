import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/painting.dart' show Color;
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../models/order.dart';
import 'api.dart';
import 'store.dart';
import '../utils/dates.dart';

/// One thing the captain was told about, kept so the notifications screen can
/// show a history rather than only what Android still has in its tray.
class PartnerNotification {
  PartnerNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.timestamp,
    required this.orderId,
    required this.screen,
    this.read = false,
  });

  final String id;
  final String title;
  final String message;
  final DateTime timestamp;
  final String orderId;
  final String screen;
  bool read;

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'message': message,
        'timestamp': timestamp.toIso8601String(),
        'orderId': orderId,
        'screen': screen,
        'read': read,
      };

  factory PartnerNotification.fromJson(Map<String, dynamic> json) =>
      PartnerNotification(
        id: (json['id'] ?? '').toString(),
        title: (json['title'] ?? '').toString(),
        message: (json['message'] ?? '').toString(),
        timestamp:
            parseDate((json['timestamp'] ?? '').toString()) ?? DateTime.now(),
        orderId: (json['orderId'] ?? '').toString(),
        screen: (json['screen'] ?? '/pickups').toString(),
        read: json['read'] == true,
      );
}

/// `hooks/usePartnerOrderMonitor.ts`.
///
/// Polls the captain's own orders every ten seconds and turns the changes that
/// matter into notifications: a new unclaimed order in their pincodes, an
/// order assigned to them, and an order the hub has finished.
///
/// Two things the web version does are kept deliberately. It asks the server
/// for `partnerScope`, which returns this captain's orders plus the unclaimed
/// ones in their areas rather than every order in the database. And it does
/// not poll while the app is in the background, because that only costs the
/// captain battery and data.
///
/// Who it runs for follows the signed-in captain rather than being read once
/// at launch, so signing in starts it and signing out stops it without the app
/// being restarted.
class Notifications {
  Notifications._();

  static final instance = Notifications._();

  final _plugin = FlutterLocalNotificationsPlugin();
  final _statuses = <String, ({String status, String partnerId})>{};
  final _announced = <String>{};

  Timer? _timer;
  bool _ready = false;
  bool _foreground = true;
  List<String> _pincodes = const [];

  /// The order id behind a notification the captain tapped, for the app to
  /// open. The Capacitor build registered no listener at all, so tapping a
  /// notification there did nothing.
  final tappedOrderId = ValueNotifier<String?>(null);

  /// The screen that notification was about -- a new pickup points at the
  /// pickup list, an order ready to go out points at the delivery list. Set
  /// alongside [tappedOrderId], and read by the listener in main.dart.
  String? tappedScreen;

  final _items = <PartnerNotification>[];
  List<PartnerNotification> get items => List.unmodifiable(_items);

  /// Pushed to whenever the stored list changes, so the screen can redraw.
  final changes = ValueNotifier<int>(0);

  Future<void> _init() async {
    if (_ready) return;

    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const ios = DarwinInitializationSettings();
    await _plugin.initialize(
      const InitializationSettings(android: android, iOS: ios),
      onDidReceiveNotificationResponse: (response) {
        final payload = response.payload;
        if (payload == null || payload.isEmpty) return;
        try {
          final data = jsonDecode(payload) as Map<String, dynamic>;
          tappedScreen = data['screen']?.toString();
          tappedOrderId.value = data['orderId']?.toString();
        } catch (_) {
          // A payload we cannot read is not worth crashing over.
        }
      },
    );

    // The same channel the Capacitor build declares, so an upgrade keeps the
    // captain's existing notification settings for it.
    final android_ = _plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    await android_?.createNotificationChannel(
      const AndroidNotificationChannel(
        'partner-orders',
        'Order Updates',
        description: 'Notifications for new orders and delivery updates',
        importance: Importance.high,
      ),
    );
    await android_?.requestNotificationsPermission();

    _restore();
    _ready = true;
  }

  void _restore() {
    final stored = Store.getString(Store.kNotifications);
    if (stored == null || stored.isEmpty) return;
    try {
      final list = jsonDecode(stored) as List<dynamic>;
      _items
        ..clear()
        ..addAll(list.whereType<Map>().map(
            (m) => PartnerNotification.fromJson(Map<String, dynamic>.from(m))));
    } catch (_) {
      // Unreadable history is dropped rather than carried forward broken.
    }
  }

  Future<void> _persist() async {
    // A cap, so a busy month does not grow the stored list without limit.
    if (_items.length > 100) _items.removeRange(100, _items.length);
    await Store.setString(
      Store.kNotifications,
      jsonEncode(_items.map((n) => n.toJson()).toList()),
    );
    changes.value++;
  }

  Future<void> start() async {
    await _init();
    stop(clearHistory: false);

    // Whoever was here before is gone; nothing of theirs should carry over.
    _statuses.clear();
    _announced.clear();
    _pincodes = const [];

    await _loadPincodes();
    await _poll();
    _timer = Timer.periodic(const Duration(seconds: 10), (_) => _poll());
  }

  void stop({bool clearHistory = true}) {
    _timer?.cancel();
    _timer = null;
    if (clearHistory) {
      _items.clear();
      changes.value++;
    }
  }

  void setForeground(bool value) {
    final resumed = value && !_foreground;
    _foreground = value;
    // Catch up as soon as the captain comes back to the app.
    if (resumed && _timer != null) _poll();
  }

  Future<void> _loadPincodes() async {
    final partnerId = Store.partnerId;
    if (partnerId == null) return;
    final result = await Api.partner(partnerId);
    if (!result.ok) return;
    final pincodes = result.map['pincodes'];
    if (pincodes is List) {
      _pincodes = pincodes.map((p) => p.toString()).toList();
    }
  }

  Future<void> _poll() async {
    if (!_foreground) return;
    final partnerId = Store.partnerId;
    if (partnerId == null) return;

    final result = await Api.ordersInScope(partnerId);
    if (!result.ok) return;

    for (final raw in result.list.whereType<Map>()) {
      final order = PartnerOrder(Map<String, dynamic>.from(raw));
      final previous = _statuses[order.orderId];
      final currentPartner = order.partnerId;
      final tag = order.expressDelivery ? ' (Express Delivery — 12hr)' : '';
      final inMyArea = order.pickupAddress.pincode.isNotEmpty &&
          _pincodes.contains(order.pickupAddress.pincode);

      // A new order nobody has claimed, in one of this captain's areas.
      if (order.status == 'pending' &&
          currentPartner.isEmpty &&
          inMyArea &&
          !_announced.contains(order.id)) {
        await _notify(
          title: '\u{1F195} New Order Available',
          message: 'New pickup order #${order.orderId} available in your '
              'area$tag. Tap to accept.',
          orderId: order.orderId,
          screen: '/pickups',
        );
        _announced.add(order.id);
      }

      // Assigned to this captain.
      if ((previous?.partnerId ?? '').isEmpty && currentPartner == partnerId) {
        await _notify(
          title: '\u{1F4E6} Order Assigned',
          message: 'Order #${order.orderId} assigned to you for pickup$tag.',
          orderId: order.orderId,
          screen: '/pickups',
        );
      }

      // Finished at the hub and ready to go out.
      if (previous?.status != 'process_completed' &&
          order.status == 'process_completed' &&
          currentPartner == partnerId) {
        await _notify(
          title: '✅ Ready for Delivery',
          message: 'Order #${order.orderId} is processed and ready for '
              'delivery$tag.',
          orderId: order.orderId,
          screen: '/delivery/pick',
        );
      }

      _statuses[order.orderId] =
          (status: order.status, partnerId: currentPartner);
    }
  }

  Future<void> _notify({
    required String title,
    required String message,
    required String orderId,
    required String screen,
  }) async {
    final id = '${orderId}_${DateTime.now().millisecondsSinceEpoch}';
    _items.insert(
      0,
      PartnerNotification(
        id: id,
        title: title,
        message: message,
        timestamp: DateTime.now(),
        orderId: orderId,
        screen: screen,
      ),
    );
    await _persist();

    const details = NotificationDetails(
      android: AndroidNotificationDetails(
        'partner-orders',
        'Order Updates',
        channelDescription: 'Notifications for new orders and delivery updates',
        importance: Importance.high,
        priority: Priority.high,
        color: Color(0xFF452D9B),
        icon: '@mipmap/ic_launcher',
        autoCancel: true,
      ),
      iOS: DarwinNotificationDetails(),
    );

    await _plugin.show(
      DateTime.now().millisecondsSinceEpoch.remainder(100000),
      title,
      message,
      details,
      payload: jsonEncode({'orderId': orderId, 'screen': screen}),
    );
  }

  /// Marks one of the monitor's own messages as read. A broadcast from the
  /// admin is not in this list; the notifications screen keeps those ids in
  /// `partner_read_notifications`, as the web app does.
  Future<void> markRead(String id) async {
    final match = _items.where((n) => n.id == id);
    if (match.isEmpty) return;
    match.first.read = true;
    await _persist();
  }

  Future<void> markAllRead() async {
    for (final item in _items) {
      item.read = true;
    }
    await _persist();
  }

  Future<void> remove(String id) async {
    _items.removeWhere((n) => n.id == id);
    await _persist();
  }
}
