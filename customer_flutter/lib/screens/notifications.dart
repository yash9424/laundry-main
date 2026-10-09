import 'package:flutter/material.dart';

import '../services/notifications.dart';
import '../theme/brand.dart';
import '../widgets/common.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    // Opening this screen is as good a moment as any to catch up.
    Notifications.instance.setForeground(true);
  }

  String _ago(DateTime when) {
    final diff = DateTime.now().difference(when);
    // Under an hour reads "Just now", the same wording Notifications.tsx uses.
    if (diff.inHours < 1) return 'Just now';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${when.day}/${when.month}/${when.year}';
  }

  IconData _icon(AppNotification notification) {
    switch (notification.orderStatus) {
      case 'delivered':
        return Icons.check_circle_outline;
      case 'cancelled':
        return Icons.cancel_outlined;
      case 'delivery_failed':
      case 'suspended':
        return Icons.warning_amber_rounded;
      case 'out_for_delivery':
      case 'picked_up':
        return Icons.local_shipping_outlined;
      default:
        return notification.type == 'promotion'
            ? Icons.card_giftcard
            : Icons.notifications_none;
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
            return TextButton(
              onPressed: () async {
                if (allRead) {
                  await Notifications.instance.clearAll();
                } else {
                  await Notifications.instance.markAllAsRead();
                }
              },
              child: Text(
                allRead ? 'Clear All' : 'Mark Read',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            );
          },
        ),
      ),
      body: ValueListenableBuilder<int>(
        valueListenable: Notifications.instance.revision,
        builder: (context, _, __) {
          final items = Notifications.instance.items;
          if (items.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: const [
                    Icon(Icons.notifications_none,
                        size: 64, color: Color(0xFFD1D5DB)),
                    SizedBox(height: 16),
                    Text(
                      'No notifications yet',
                      style: TextStyle(
                        fontFamily: 'Montserrat',
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    SizedBox(height: 6),
                    Text(
                      'Updates about your orders will show up here.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Brand.mutedForeground, fontSize: 14),
                    ),
                  ],
                ),
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            itemCount: items.length,
            itemBuilder: (context, index) {
              final notification = items[index];
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Dismissible(
                  key: ValueKey(notification.id),
                  direction: DismissDirection.endToStart,
                  background: Container(
                    alignment: Alignment.centerRight,
                    padding: const EdgeInsets.only(right: 20),
                    decoration: BoxDecoration(
                      color: Brand.destructive,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Icon(Icons.delete_outline, color: Colors.white),
                  ),
                  onDismissed: (_) =>
                      Notifications.instance.delete(notification.id),
                  child: _card(notification),
                ),
              );
            },
          );
        },
      ),
    );
  }

  Widget _card(AppNotification notification) {
    return Material(
      color: notification.read ? Colors.white : const Color(0xFFF5F3FF),
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () async {
          // Held before the await: the navigator is needed after it.
          final navigator = Navigator.of(context);
          await Notifications.instance.markAsRead(notification.id);
          final orderId = notification.orderId;
          if (orderId != null && orderId.isNotEmpty) {
            navigator.pushNamed(
              '/order-details',
              arguments: {'orderId': orderId},
            );
          }
        },
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: notification.read
                ? null
                : Border.all(color: const Color(0xFFDDD6FE), width: 2),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                height: 38,
                width: 38,
                decoration: BoxDecoration(
                  gradient: Brand.gradient,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(_icon(notification),
                    size: 19, color: Colors.white),
              ),
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
                            notification.title,
                            style: TextStyle(
                              fontSize: 14.5,
                              fontWeight: notification.read
                                  ? FontWeight.w600
                                  : FontWeight.w700,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _ago(notification.timestamp),
                          style: const TextStyle(
                              fontSize: 11.5, color: Brand.mutedForeground),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      notification.message,
                      style: const TextStyle(
                          fontSize: 13, color: Brand.gray600, height: 1.5),
                    ),
                  ],
                ),
              ),
              IconButton(
                visualDensity: VisualDensity.compact,
                icon: const Icon(Icons.close, size: 16, color: Brand.mutedForeground),
                onPressed: () =>
                    Notifications.instance.delete(notification.id),
              ),
            ],
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
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
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
