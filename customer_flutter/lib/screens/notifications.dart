import 'package:flutter/material.dart';

import '../services/notifications.dart';
import '../theme/brand.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/common.dart';

const _blue200 = Color(0xFFBFDBFE);
const _blue700 = Color(0xFF1D4ED8);
const _blue800 = Color(0xFF1E40AF);
const _cyan50 = Color(0xFFECFEFF);

/// `shadow-lg`.
const _shadowLg = [
  BoxShadow(color: Color(0x1A000000), blurRadius: 15, offset: Offset(0, 10)),
];

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  bool _showPermissionRequest = false;

  @override
  void initState() {
    super.initState();
    // Opening this screen is as good a moment as any to catch up.
    Notifications.instance.setForeground(true);
    _checkPermission();
  }

  Future<void> _checkPermission() async {
    final granted = await Notifications.instance.permissionGranted();
    if (!mounted || granted) return;
    setState(() => _showPermissionRequest = true);
  }

  Future<void> _requestPermission() async {
    final granted = await Notifications.instance.requestPermission();
    if (!mounted || !granted) return;
    setState(() => _showPermissionRequest = false);
  }

  String _ago(DateTime when) {
    final diff = DateTime.now().difference(when);
    // Under an hour reads "Just now", the same wording Notifications.tsx uses.
    if (diff.inHours < 1) return 'Just now';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${when.day}/${when.month}/${when.year}';
  }

  /// The web screen draws these as emoji rather than icons, one per status.
  String _icon(AppNotification notification) {
    if (notification.type == 'order_status' &&
        notification.orderStatus != null) {
      switch (notification.orderStatus) {
        case 'pending':
          return '📋';
        case 'reached_location':
          return '🚗';
        case 'picked_up':
          return '📦';
        case 'delivered_to_hub':
          return '🏭';
        case 'processing':
          return '🧺';
        case 'ironing':
          return '👔';
        case 'process_completed':
          return '✨';
        case 'ready':
          return '✅';
        case 'out_for_delivery':
          return '🚚';
        case 'delivered':
          return '🎉';
        case 'cancelled':
          return '❌';
        case 'delivery_failed':
          return '⚠️';
        case 'suspended':
          return '🚫';
        default:
          return '📦';
      }
    }

    switch (notification.type) {
      case 'order_status':
        return '📦';
      case 'promotion':
        return '🎉';
      case 'system':
        return '⚙️';
      default:
        return '🔔';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Brand.gray50,
      appBar: AppHeader(
        title: 'Notifications',
        gradient: true,
        action: ValueListenableBuilder<int>(
          valueListenable: Notifications.instance.revision,
          builder: (context, _, __) {
            final items = Notifications.instance.items;
            if (items.isEmpty) return const SizedBox.shrink();
            final allRead = items.every((n) => n.read);
            return GestureDetector(
              onTap: () async {
                if (allRead) {
                  await Notifications.instance.clearAll();
                } else {
                  await Notifications.instance.markAllAsRead();
                }
              },
              behavior: HitTestBehavior.opaque,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 4,
                ), // px-2 py-1
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2), // bg-white/20
                  borderRadius: BorderRadius.circular(Brand.rLg),
                ),
                child: Text(
                  allRead ? 'Clear All' : 'Mark Read',
                  style: const TextStyle(
                    fontFamily: Brand.heading, // a <button>
                    color: Colors.white,
                    fontSize: 12, // text-xs
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            );
          },
        ),
      ),
      bottomNavigationBar: const AppBottomNav(current: '/notifications'),
      body: ValueListenableBuilder<int>(
        valueListenable: Notifications.instance.revision,
        builder: (context, _, __) {
          final items = Notifications.instance.items;
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24), // px-4 py-4
            children: [
              if (_showPermissionRequest) ...[
                _permissionCard(),
                const SizedBox(height: 32), // mb-4 + space-y-4
              ],
              if (items.isEmpty)
                _empty()
              else
                for (var i = 0; i < items.length; i++) ...[
                  if (i > 0) const SizedBox(height: 16), // space-y-4
                  _card(items[i]),
                ],
            ],
          );
        },
      ),
    );
  }

  Widget _permissionCard() => Container(
    padding: const EdgeInsets.all(16), // p-4
    decoration: BoxDecoration(
      gradient: const LinearGradient(colors: [Brand.blue50, _cyan50]),
      border: Border.all(color: _blue200, width: 2), // border-2
      borderRadius: BorderRadius.circular(Brand.r2xl),
    ),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('🔔', style: TextStyle(fontSize: 24)), // text-2xl
        const SizedBox(width: 12), // gap-3
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Enable Notifications',
                // <h3> with no size utility, so the base rule's text-sm.
                style: TextStyle(
                  fontFamily: Brand.heading,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: _blue800,
                ),
              ),
              const SizedBox(height: 8), // mb-2
              const Text(
                "Get instant updates about your order status - when it's "
                'picked up, processed, and delivered!',
                style: TextStyle(
                  fontSize: 14, // text-sm
                  height: 10 / 7,
                  color: _blue700,
                ),
              ),
              const SizedBox(height: 12), // mb-3
              Row(
                children: [
                  GestureDetector(
                    onTap: _requestPermission,
                    behavior: HitTestBehavior.opaque,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ), // px-4 py-2
                      decoration: BoxDecoration(
                        gradient: Brand.gradient,
                        borderRadius: BorderRadius.circular(Brand.rXl),
                      ),
                      child: const Text(
                        'Allow Notifications',
                        style: TextStyle(
                          fontFamily: Brand.heading,
                          fontSize: 14, // text-sm
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8), // gap-2
                  GestureDetector(
                    onTap: () => setState(() => _showPermissionRequest = false),
                    behavior: HitTestBehavior.opaque,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: Brand.gray300,
                        borderRadius: BorderRadius.circular(Brand.rXl),
                      ),
                      child: const Text(
                        'Maybe Later',
                        style: TextStyle(
                          fontFamily: Brand.heading,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Brand.gray700,
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

  /// `text-center py-12`, which sits below the header rather than centring on
  /// the page.
  Widget _empty() => const Padding(
    padding: EdgeInsets.symmetric(vertical: 48), // py-12
    child: Column(
      children: [
        Icon(
          Icons.notifications_none,
          size: 64, // w-16 h-16
          color: Brand.gray300,
        ),
        SizedBox(height: 16), // mb-4
        Text(
          'No Notifications',
          style: TextStyle(
            fontFamily: Brand.heading,
            fontSize: 18, // text-lg
            fontWeight: FontWeight.w600,
            color: Brand.gray600,
          ),
        ),
        SizedBox(height: 8), // mb-2
        Text(
          "You're all caught up! New notifications will appear here.",
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 16, height: 1.5, color: Brand.gray500),
        ),
      ],
    ),
  );

  Widget _card(AppNotification notification) {
    final unread = !notification.read;
    final message = notification.message.length > 100
        ? '${notification.message.substring(0, 100)}...'
        : notification.message;

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(Brand.r2xl),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(Brand.r2xl),
          boxShadow: _shadowLg,
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(Brand.r2xl),
          child: InkWell(
            onTap: () async {
              // Held before the await: the navigator is needed after it.
              final navigator = Navigator.of(context);
              if (unread) {
                await Notifications.instance.markAsRead(notification.id);
              }
              final orderId = notification.orderId;
              if (notification.type == 'order_status' &&
                  orderId != null &&
                  orderId.isNotEmpty) {
                navigator.pushNamed(
                  '/order-details',
                  arguments: {'orderId': orderId},
                );
              }
            },
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // `border-l-4 border-blue-500` on an unread card. The border
                // sits inside the card's width, so the padding follows it.
                if (unread)
                  const SizedBox(
                    width: 4,
                    child: ColoredBox(color: Brand.blue500),
                  ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(16), // p-4
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _icon(notification),
                          style: const TextStyle(fontSize: 24), // text-2xl
                        ),
                        const SizedBox(width: 12), // gap-3
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                    child: Text(
                                      notification.title,
                                      style: TextStyle(
                                        fontFamily: Brand.heading, // <h3>
                                        fontSize: 14, // text-sm
                                        fontWeight: FontWeight.w600,
                                        color: unread
                                            ? Colors.black
                                            : Brand.gray700,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8), // gap-2
                                  Text(
                                    _ago(notification.timestamp),
                                    style: const TextStyle(
                                      fontSize: 12, // text-xs
                                      color: Brand.gray500,
                                    ),
                                  ),
                                  const SizedBox(width: 8), // gap-2
                                  GestureDetector(
                                    onTap: () => Notifications.instance.delete(
                                      notification.id,
                                    ),
                                    behavior: HitTestBehavior.opaque,
                                    child: const Padding(
                                      padding: EdgeInsets.all(4), // p-1
                                      child: Icon(
                                        Icons.delete_outline,
                                        size: 16, // w-4 h-4
                                        color: Brand.gray400,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4), // mt-1
                              Text(
                                message,
                                style: TextStyle(
                                  fontSize: 14, // text-sm
                                  height: 10 / 7,
                                  color: unread ? Brand.gray700 : Brand.gray500,
                                ),
                              ),
                              if (unread)
                                Container(
                                  margin: const EdgeInsets.only(top: 8), // mt-2
                                  height: 8, // w-2 h-2
                                  width: 8,
                                  decoration: const BoxDecoration(
                                    color: Brand.blue500,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
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

/// A bell with an unread count, for anywhere that wants to show one.
class NotificationBell extends StatelessWidget {
  const NotificationBell({super.key, this.color = Colors.white});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<int>(
      valueListenable: Notifications.instance.revision,
      builder: (context, _, __) {
        final unread = Notifications.instance.unreadCount;
        return Stack(
          clipBehavior: Clip.none,
          children: [
            IconButton(
              icon: Icon(Icons.notifications_none, color: color),
              onPressed: () =>
                  Navigator.of(context).pushNamed('/notifications'),
            ),
            if (unread > 0)
              Positioned(
                right: 6,
                top: 6,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 5,
                    vertical: 1,
                  ),
                  decoration: BoxDecoration(
                    color: Brand.destructive,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    unread > 9 ? '9+' : '$unread',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 9.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}
