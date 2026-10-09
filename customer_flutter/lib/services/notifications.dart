import 'dart:async';
import 'dart:math';

import 'package:flutter/widgets.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import 'api.dart';
import 'store.dart';

/// One notification as the app keeps it.
class AppNotification {
  AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.timestamp,
    required this.type,
    this.read = false,
    this.orderId,
    this.orderStatus,
  });

  final String id;
  final String title;
  final String message;
  final DateTime timestamp;
  final String type;
  bool read;
  final String? orderId;
  final String? orderStatus;

  /// Identifies an order notification by what it is about rather than by id, so
  /// the same status change is never announced twice.
  String? get statusKey =>
      (orderId == null || orderStatus == null) ? null : '${orderId}_$orderStatus';

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'message': message,
        'timestamp': timestamp.toIso8601String(),
        'type': type,
        'read': read,
        if (orderId != null) 'orderId': orderId,
        if (orderStatus != null) 'orderStatus': orderStatus,
      };

  factory AppNotification.fromJson(Map<String, dynamic> json) =>
      AppNotification(
        id: (json['id'] ?? '').toString(),
        title: (json['title'] ?? '').toString(),
        message: (json['message'] ?? '').toString(),
        timestamp:
            DateTime.tryParse(json['timestamp']?.toString() ?? '')?.toLocal() ??
                DateTime.now(),
        type: (json['type'] ?? 'system').toString(),
        read: json['read'] == true,
        orderId: json['orderId']?.toString(),
        orderStatus: json['orderStatus']?.toString(),
      );
}

/// What each order status says to the customer.
const _statusTemplates = <String, ({String title, String message})>{
  'pending': (
    title: '\u{1F4CB} Order Confirmed',
    message: 'Your order has been confirmed and is being prepared for pickup.'
  ),
  'reached_location': (
    title: '\u{1F697} Partner Reached Location',
    message: 'Our delivery partner has reached your pickup location.'
  ),
  'picked_up': (
    title: '\u{1F4E6} Order Picked Up',
    message:
        'Your order has been picked up and is on the way to our processing hub.'
  ),
  'delivered_to_hub': (
    title: '\u{1F3ED} Order at Processing Hub',
    message:
        'Your order has been delivered to our processing hub and will be processed soon.'
  ),
  'process_completed': (
    title: '✨ Processing Complete',
    message: 'Your order has been processed and is ready for delivery.'
  ),
  'out_for_delivery': (
    title: '\u{1F69A} Out for Delivery',
    message:
        'Great news! Your order is out for delivery and will reach you soon.'
  ),
  'delivered': (
    title: '\u{1F389} Order Delivered Successfully',
    message:
        'Your order has been successfully delivered. Thank you for choosing Urban Steam!'
  ),
  'cancelled': (
    title: '❌ Order Cancelled',
    message:
        'Your order has been cancelled. If you have any questions, please contact support.'
  ),
  'delivery_failed': (
    title: '⚠️ Delivery Failed',
    message:
        'We were unable to deliver your order. Our team will contact you to reschedule delivery.'
  ),
  'suspended': (
    title: '\u{1F6AB} Order Suspended',
    message:
        'Your order has been suspended due to multiple delivery failures. Please contact support.'
  ),
};

/// Order status notifications and the phone's own notification drawer.
///
/// A notification shows in two places only: the notifications screen and the
/// drawer. It deliberately never pops a toast over whatever the customer is
/// doing.
///
/// The poll runs only while the app is in the foreground and only for the
/// customer who is signed in right now -- it used to start at launch and keep
/// running under the previous customer's id after a logout.
class Notifications {
  Notifications._();
  static final Notifications instance = Notifications._();

  static const _channelId = 'order-updates';
  static const _pollInterval = Duration(seconds: 2);

  final _plugin = FlutterLocalNotificationsPlugin();
  final _random = Random();

  /// Rebuilds the notifications screen and any unread badge.
  final ValueNotifier<int> revision = ValueNotifier<int>(0);

  /// Where a tapped notification should take the customer.
  final ValueNotifier<String?> tappedOrderId = ValueNotifier<String?>(null);

  List<AppNotification> _items = [];
  final Map<String, String> _lastStatus = {};

  Timer? _timer;
  String? _watching;
  bool _ready = false;
  bool _foreground = true;
  bool _busy = false;

  List<AppNotification> get items => List.unmodifiable(_items);

  int get unreadCount => _items.where((n) => !n.read).length;

  // ---- per-customer storage keys ----------------------------------------

  /// Every store is scoped to the signed-in customer. These used to be plain
  /// keys shared by the device, so a second person signing in on the same phone
  /// inherited the previous customer's notifications.
  String _key(String name) => '${name}_${Store.customerId ?? 'anonymous'}';

  List<String> _keyList(String name) {
    final raw = Store.getJson(_key(name));
    return raw is List ? raw.map((e) => e.toString()).toList() : <String>[];
  }

  Future<void> _addToKeyList(String name, String value) async {
    final list = _keyList(name);
    if (list.contains(value)) return;
    list.add(value);
    await Store.setJson(_key(name), list);
  }

  // ---- setup -------------------------------------------------------------

  Future<void> _ensureReady() async {
    if (_ready) return;
    const android = AndroidInitializationSettings('ic_notification_custom');
    const ios = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    await _plugin.initialize(
      const InitializationSettings(android: android, iOS: ios),
      onDidReceiveNotificationResponse: (response) {
        // Tapping a notification opens the order it is about. In the Capacitor
        // build nothing listened for this, so a tap did nothing at all.
        final payload = response.payload;
        if (payload != null && payload.isNotEmpty) {
          tappedOrderId.value = payload;
        }
      },
    );

    final android13 = _plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    await android13?.requestNotificationsPermission();
    await android13?.createNotificationChannel(const AndroidNotificationChannel(
      _channelId,
      'Order Updates',
      description: 'Notifications for order status updates',
      importance: Importance.max,
      playSound: true,
      enableLights: true,
      ledColor: Color(0xFF452D9B),
      enableVibration: true,
    ));

    _ready = true;
  }

  // ---- lifecycle ---------------------------------------------------------

  /// Starts (or restarts) watching for the customer who is signed in now.
  Future<void> start() async {
    final customerId = Store.customerId;
    if (customerId == null) {
      await stop();
      return;
    }
    if (Store.getString('notificationsEnabled') == 'false') {
      await stop();
      return;
    }
    if (_watching == customerId && _timer != null) return;

    _watching = customerId;
    // Whoever was here before is gone; their statuses must not carry over.
    _lastStatus.clear();
    await _ensureReady();
    _load();

    _timer?.cancel();
    _timer = Timer.periodic(_pollInterval, (_) => _poll());
    await _poll();
  }

  /// Stops the poll now rather than on its next tick, so it cannot make one
  /// more call under the customer who just left.
  Future<void> stop() async {
    _timer?.cancel();
    _timer = null;
    _watching = null;
    _items = [];
    _lastStatus.clear();
    revision.value++;
    try {
      await _plugin.cancelAll();
    } catch (_) {
      // Nothing to cancel, or no permission; not worth surfacing.
    }
  }

  /// Called from the app's lifecycle observer. Nothing to report to someone who
  /// is not looking, and polling in the background only costs battery and data.
  void setForeground(bool foreground) {
    _foreground = foreground;
    if (foreground) _poll();
  }

  Future<void> _poll() async {
    if (!_foreground || _busy) return;
    final customerId = _watching;
    if (customerId == null) return;
    _busy = true;
    try {
      await _checkOrderStatuses(customerId);
      await _fetchServerNotifications(customerId);
    } finally {
      _busy = false;
    }
  }

  // ---- stored list -------------------------------------------------------

  void _load() {
    final raw = Store.getJson(_key('customer_notifications'));
    final cleared = _keyList('cleared_notifications');
    final deleted = _keyList('deleted_notifications');
    _items = raw is List
        ? raw
            .whereType<Map>()
            .map((m) => AppNotification.fromJson(Map<String, dynamic>.from(m)))
            .where((n) =>
                !deleted.contains(n.id) &&
                !(n.statusKey != null && cleared.contains(n.statusKey)))
            .toList()
        : [];
    revision.value++;
  }

  Future<void> _save() async {
    await Store.setJson(
      _key('customer_notifications'),
      _items.map((n) => n.toJson()).toList(),
    );
    revision.value++;
  }

  Future<void> _add(AppNotification notification) async {
    // Already known, by what it is about rather than by id.
    final already = _items.any((n) =>
        n.id == notification.id ||
        (notification.statusKey != null &&
            n.statusKey == notification.statusKey));
    if (already) return;

    if (notification.statusKey != null &&
        _keyList('cleared_notifications').contains(notification.statusKey)) {
      return;
    }
    if (_keyList('deleted_notifications').contains(notification.id)) return;

    _items.insert(0, notification);
    if (_items.length > 100) _items = _items.sublist(0, 100);
    await _save();
    await _push(notification);
  }

  // ---- sources -----------------------------------------------------------

  Future<void> _checkOrderStatuses(String customerId) async {
    final result = await Api.myOrders(customerId);
    if (!result.ok) return;
    // The signed-in customer may have changed while this was in flight.
    if (_watching != customerId) return;

    for (final raw in result.list.whereType<Map>()) {
      final order = Map<String, dynamic>.from(raw);
      final orderId = (order['orderId'] ?? '').toString();
      final status = (order['status'] ?? '').toString();
      if (orderId.isEmpty || status.isEmpty) continue;

      final template = _statusTemplates[status];
      final previous = _lastStatus[orderId];
      if (template != null && previous != status) {
        final express = order['expressDelivery'] == true;
        await _add(AppNotification(
          id: 'order_${orderId}_${status}_${DateTime.now().millisecondsSinceEpoch}',
          title: template.title,
          message: '${template.message} '
              '(Order #$orderId${express ? ' — Express Delivery' : ''})',
          timestamp: DateTime.now(),
          type: 'order_status',
          orderId: orderId,
          orderStatus: status,
        ));
      }
      _lastStatus[orderId] = status;
    }
  }

  Future<void> _fetchServerNotifications(String customerId) async {
    final result = await Api.notifications(customerId);
    if (!result.ok || _watching != customerId) return;

    for (final raw in result.list.whereType<Map>()) {
      final map = Map<String, dynamic>.from(raw);
      final id = (map['id'] ?? '').toString();
      if (id.isEmpty) continue;
      await _add(AppNotification(
        id: id,
        title: (map['title'] ?? '').toString(),
        message: (map['message'] ?? '').toString(),
        timestamp:
            DateTime.tryParse(map['timestamp']?.toString() ?? '')?.toLocal() ??
                DateTime.now(),
        type: (map['type'] ?? 'system').toString(),
        orderId: map['orderId']?.toString(),
        orderStatus: map['orderStatus']?.toString(),
      ));
    }
  }

  // ---- the drawer --------------------------------------------------------

  Future<void> _push(AppNotification notification) async {
    if (Store.getString('notificationsEnabled') == 'false') return;

    final pushed = _keyList('pushed_notifications');
    if (pushed.contains(notification.id)) return;
    final statusKey = notification.statusKey;
    if (statusKey != null && pushed.contains(statusKey)) return;

    await _ensureReady();

    try {
      await _plugin.show(
        _random.nextInt(2147483647),
        notification.title,
        notification.message,
        NotificationDetails(
          android: AndroidNotificationDetails(
            _channelId,
            'Order Updates',
            channelDescription: 'Notifications for order status updates',
            importance: Importance.max,
            priority: Priority.high,
            icon: 'ic_notification_custom',
            color: const Color(0xFF452D9B),
            autoCancel: true,
            styleInformation: BigTextStyleInformation(
              notification.message,
              summaryText: 'Urban Steam',
            ),
          ),
          iOS: const DarwinNotificationDetails(presentSound: true),
        ),
        payload: notification.orderId,
      );
    } catch (_) {
      // No permission, or the channel is blocked. The notification is still in
      // the app's own list, which is what matters most.
    }

    if (statusKey != null) await _addToKeyList('pushed_notifications', statusKey);
    await _addToKeyList('pushed_notifications', notification.id);
  }

  // ---- what the notifications screen calls -------------------------------

  Future<void> markAsRead(String id) async {
    for (final n in _items) {
      if (n.id == id) n.read = true;
    }
    await _save();
  }

  Future<void> markAllAsRead() async {
    for (final n in _items) {
      n.read = true;
    }
    await _save();
  }

  Future<void> delete(String id) async {
    AppNotification? found;
    for (final n in _items) {
      if (n.id == id) found = n;
    }
    await _addToKeyList('deleted_notifications', id);
    final statusKey = found?.statusKey;
    if (statusKey != null) {
      await _addToKeyList('cleared_notifications', statusKey);
    }
    _items.removeWhere((n) => n.id == id);
    await _save();
  }

  Future<void> clearAll() async {
    for (final n in _items) {
      await _addToKeyList('deleted_notifications', n.id);
      final statusKey = n.statusKey;
      if (statusKey != null) {
        await _addToKeyList('cleared_notifications', statusKey);
      }
    }
    _items = [];
    await _save();
    try {
      await _plugin.cancelAll();
    } catch (_) {
      // Nothing in the drawer to remove.
    }
  }
}
