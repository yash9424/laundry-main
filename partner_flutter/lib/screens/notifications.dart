import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:intl/intl.dart';

import '../services/api.dart';
import '../services/notifications.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/common.dart';
import '../utils/dates.dart';
import '../widgets/bottom_nav.dart';

/// `app/notifications/page.tsx`.
///
/// Two sources end up in one list: whatever the admin has broadcast to
/// captains, and the order-monitor's own messages, which are kept on the phone
/// because the server never saw them.
///
/// One deliberate difference. When the API returned nothing the web screen
/// filled the list with invented examples -- "New Pickup Available ... Order
/// #ORD001", "Payment Received ... Rs.350" -- which a captain cannot tell from
/// real ones. An empty list says there is nothing instead.
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<PartnerNotification> _items = const [];
  bool _loading = true;
  bool _askPermission = false;

  @override
  void initState() {
    super.initState();
    Notifications.instance.changes.addListener(_onStoreChanged);
    _checkPermission();
    _load();
  }

  @override
  void dispose() {
    Notifications.instance.changes.removeListener(_onStoreChanged);
    super.dispose();
  }

  void _onStoreChanged() {
    if (mounted) _load();
  }

  Future<void> _checkPermission() async {
    final android = FlutterLocalNotificationsPlugin()
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();
    final enabled = await android?.areNotificationsEnabled();
    if (!mounted) return;
    setState(() => _askPermission = enabled == false);
  }

  Future<void> _requestPermission() async {
    final android = FlutterLocalNotificationsPlugin()
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();
    final granted = await android?.requestNotificationsPermission();
    if (!mounted) return;
    setState(() => _askPermission = granted == false);
  }

  Future<void> _load() async {
    final partnerId = Store.partnerId;
    if (partnerId == null) {
      if (mounted) {
        Navigator.of(context).pushNamedAndRemoveUntil('/login', (r) => false);
      }
      return;
    }

    // The order monitor's own messages are already on the phone.
    final local = List<PartnerNotification>.from(Notifications.instance.items);

    // Anything the admin has broadcast to captains. A broadcast carries no
    // per-captain state -- the route hands every one of them back as unread on
    // every load -- so which ones this captain has opened or swiped away is
    // remembered on the phone, under the same two keys the web app uses.
    final readIds = Store.getIds(Store.kReadNotifications);
    final deletedIds = Store.getIds(Store.kDeletedNotifications);

    final result = await Api.notifications(partnerId);
    final remote = <PartnerNotification>[];
    if (result.ok) {
      for (final raw in result.list.whereType<Map>()) {
        final map = Map<String, dynamic>.from(raw);
        final id = (map['_id'] ?? map['id'] ?? '').toString();
        if (id.isEmpty || deletedIds.contains(id)) continue;
        remote.add(PartnerNotification(
          id: id,
          title: (map['title'] ?? '').toString(),
          message: (map['message'] ?? '').toString(),
          // The route renames `sentAt` to `timestamp` on the way out
          // (admin panel/app/api/mobile/notifications/route.ts). Reading the
          // stored name instead left every broadcast dated "now", which also
          // sorted three-day-old messages above this morning's pickup alert.
          timestamp: parseDate(
                (map['timestamp'] ?? map['sentAt'] ?? map['createdAt'] ?? '')
                    .toString(),
              ) ??
              DateTime.now(),
          orderId: (map['orderId'] ?? '').toString(),
          screen: '/pickups',
          read: readIds.contains(id),
        ));
      }
    }

    if (!mounted) return;
    final all = [...local, ...remote]
      ..sort((a, b) => b.timestamp.compareTo(a.timestamp));
    setState(() {
      _items = all;
      _loading = false;
    });
  }

  Future<void> _markRead(PartnerNotification item) async {
    if (item.read) return;
    setState(() => item.read = true);
    await Notifications.instance.markRead(item.id);
    // The monitor's own messages live in its list; a broadcast does not, so
    // its id is kept here or it comes back unread on the next load.
    await Store.addId(Store.kReadNotifications, item.id);
  }

  Future<void> _delete(PartnerNotification item) async {
    setState(() => _items = _items.where((n) => n.id != item.id).toList());
    await Notifications.instance.remove(item.id);
    await Store.addId(Store.kDeletedNotifications, item.id);
  }

  void _openFull(PartnerNotification item) {
    _markRead(item);
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Brand.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Brand.r2xl),
        ),
        title: Text(
          item.title,
          style: const TextStyle(
            fontFamily: Brand.heading,
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: Colors.black,
          ),
        ),
        content: Text(
          item.message,
          style: const TextStyle(
              fontSize: 14, height: Brand.leadSm, color: Brand.gray700),
        ),
        actions: [
          if (item.orderId.isNotEmpty)
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                Navigator.of(context).pushNamed(item.screen);
              },
              child: const Text('Open',
                  style: TextStyle(
                      fontWeight: FontWeight.w600, color: Brand.purple)),
            ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close', style: TextStyle(color: Brand.gray600)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: Brand.gray50,
        body: Center(
          child: SizedBox(
            height: 48,
            width: 48,
            child:
                CircularProgressIndicator(strokeWidth: 2, color: Brand.purple),
          ),
        ),
      );
    }

    return Scaffold(
      bottomNavigationBar: const PartnerBottomNav(current: NavTab.none),
      backgroundColor: Brand.gray50,
      appBar: AppHeader(
        title: 'Notifications',
        onBack: () => Navigator.of(context).maybePop(),
      ),
      body: SafeArea(
        child: RefreshIndicator(
          color: Brand.purple,
          onRefresh: _load,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 24, 16, 24),
            children: [
              if (_askPermission) ...[
                _permissionCard(),
                const SizedBox(height: 16),
              ],
              if (_items.isEmpty)
                _empty()
              else
                for (final item in _items)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16), // space-y-4
                    child: _card(item),
                  ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _permissionCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFEFF6FF), Color(0xFFECFEFF)],
        ),
        border: Border.all(color: const Color(0xFFBFDBFE), width: 2),
        borderRadius: BorderRadius.circular(Brand.r2xl),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('\u{1F514}', style: TextStyle(fontSize: 24)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Enable Notifications',
                  style: TextStyle(
                    fontFamily: Brand.heading,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1E40AF),
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Get instant updates about new orders and when orders are '
                  'ready for delivery!',
                  style: TextStyle(
                      fontSize: 14,
                      height: Brand.leadSm,
                      color: Color(0xFF1D4ED8)),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Material(
                      color: Colors.transparent,
                      borderRadius: BorderRadius.circular(Brand.rXl),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(Brand.rXl),
                        onTap: _requestPermission,
                        child: Ink(
                          decoration: BoxDecoration(
                            gradient: Brand.gradient,
                            borderRadius: BorderRadius.circular(Brand.rXl),
                          ),
                          child: const Padding(
                            padding: EdgeInsets.symmetric(
                                horizontal: 16, vertical: 8),
                            child: Text(
                              'Allow Notifications',
                              style: TextStyle(
                                fontFamily: Brand.heading,
                                fontSize: Brand.buttonText, // <button>
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Material(
                      color: Brand.gray300,
                      borderRadius: BorderRadius.circular(Brand.rXl),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(Brand.rXl),
                        onTap: () => setState(() => _askPermission = false),
                        child: const Padding(
                          padding:
                              EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          child: Text(
                            'Maybe Later',
                            style: TextStyle(
                              fontFamily: Brand.heading,
                              fontSize: Brand.buttonText, // <button>
                              fontWeight: FontWeight.w600,
                              color: Brand.gray700,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _card(PartnerNotification item) {
    final unread = !item.read;
    final short = item.message.length > 100
        ? '${item.message.substring(0, 100)}... (tap to read more)'
        : item.message;

    return Material(
      color: Brand.surface,
      borderRadius: BorderRadius.circular(Brand.r2xl),
      elevation: 3,
      shadowColor: Colors.black12,
      child: InkWell(
        borderRadius: BorderRadius.circular(Brand.r2xl),
        onTap: () => _openFull(item),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(Brand.r2xl),
            border: unread
                ? const Border(
                    left: BorderSide(color: Brand.purple, width: 4),
                  )
                : null,
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(_icon(item), style: const TextStyle(fontSize: 24)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            item.title,
                            style: TextStyle(
                              fontFamily: Brand.heading,
                              fontSize: Brand.h3, // <h3>
                              fontWeight: FontWeight.w500,
                              color: unread ? Colors.black : Brand.gray700,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _ago(item.timestamp),
                          style: const TextStyle(
                              fontSize: 12,
                              height: Brand.leadXs,
                              color: Brand.gray500),
                        ),
                        const SizedBox(width: 4),
                        GestureDetector(
                          onTap: () => _delete(item),
                          child: const Padding(
                            padding: EdgeInsets.all(4),
                            child: Icon(Icons.delete_outline,
                                size: 16, color: Brand.gray400),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      short,
                      style: TextStyle(
                        fontSize: 14,
                        height: Brand.leadSm,
                        color: unread ? Brand.gray700 : Brand.gray500,
                      ),
                    ),
                    if (unread) ...[
                      const SizedBox(height: 8),
                      Container(
                        height: 8,
                        width: 8,
                        decoration: const BoxDecoration(
                          color: Brand.purple,
                          shape: BoxShape.circle,
                        ),
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

  Widget _empty() => const Padding(
        padding: EdgeInsets.symmetric(vertical: 48),
        child: Column(
          children: [
            Icon(Icons.notifications_none, size: 64, color: Brand.gray300),
            SizedBox(height: 16),
            Text(
              'No Notifications',
              style: TextStyle(
                fontFamily: Brand.heading,
                fontSize: Brand.h3, // <h3>
                fontWeight: FontWeight.w500,
                color: Brand.gray600,
              ),
            ),
            SizedBox(height: 8), // mb-2
            Text(
              "You're all caught up! New notifications will appear here.",
              textAlign: TextAlign.center,
              style: TextStyle(
                  fontSize: 14, height: Brand.leadSm, color: Brand.gray500),
            ),
          ],
        ),
      );

  /// The web screen picks its glyph from a `type` field; the monitor's own
  /// messages carry the screen they open instead, which says the same thing.
  static String _icon(PartnerNotification item) {
    if (item.screen.startsWith('/delivery')) return '\u{1F69A}';
    if (item.screen.startsWith('/hub')) return '\u{1F3E2}';
    if (item.screen.startsWith('/pickups')) return '\u{1F4E6}';
    return '\u{1F514}';
  }

  static String _ago(DateTime when) {
    final diff = DateTime.now().difference(when);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return DateFormat('dd/MM/yyyy').format(when);
  }
}
