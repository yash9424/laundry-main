import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/order.dart';
import '../services/api.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/common.dart';

class BookingHistoryScreen extends StatefulWidget {
  const BookingHistoryScreen({super.key});

  @override
  State<BookingHistoryScreen> createState() => _BookingHistoryScreenState();
}

class _BookingHistoryScreenState extends State<BookingHistoryScreen> {
  static const _tabs = ['Scheduled', 'In Progress', 'Delivered', 'Cancelled'];

  /// Which statuses count as still moving.
  static const _inProgress = {
    'pending',
    'confirmed',
    'reached_location',
    'picked_up',
    'delivered_to_hub',
    'processing',
    'ironing',
    'process_completed',
    'ready',
    'out_for_delivery',
  };

  String _tab = 'Scheduled';
  List<CustomerOrder> _orders = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final customerId = Store.customerId;
    if (customerId == null) {
      setState(() => _loading = false);
      return;
    }
    final result = await Api.myOrders(customerId);
    if (!mounted) return;
    setState(() {
      if (result.ok) {
        _orders = result.list
            .whereType<Map>()
            .map((m) => CustomerOrder.fromJson(Map<String, dynamic>.from(m)))
            .toList();
      }
      _loading = false;
    });
  }

  List<CustomerOrder> get _visible {
    switch (_tab) {
      case 'In Progress':
        return _orders.where((o) => _inProgress.contains(o.status)).toList();
      case 'Delivered':
        return _orders.where((o) => o.status == 'delivered').toList();
      case 'Cancelled':
        return _orders.where((o) => o.status == 'cancelled').toList();
      default:
        return _orders;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: const AppHeader(title: 'Booking History', gradient: true),
      bottomNavigationBar: const AppBottomNav(current: '/booking-history'),
      body: RefreshIndicator(
        onRefresh: _load,
        color: Brand.purple,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          children: [
            // These used to sit in a scroller with a hidden scrollbar, so on a
            // narrow phone "Cancelled" was off-screen with nothing to suggest
            // it existed. Wrapping keeps every filter visible.
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [for (final tab in _tabs) _chip(tab)],
            ),
            const SizedBox(height: 18),
            if (_loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 36),
                child: Center(
                  child: Text('Loading orders...',
                      style: TextStyle(color: Brand.mutedForeground)),
                ),
              )
            else if (_visible.isEmpty)
              _empty()
            else
              for (final order in _visible)
                Padding(
                  padding: const EdgeInsets.only(bottom: 14),
                  child: _orderCard(order),
                ),
          ],
        ),
      ),
    );
  }

  Widget _chip(String tab) {
    final active = tab == _tab;
    return Material(
      color: active ? Colors.transparent : Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => setState(() => _tab = tab),
        // No `alignment:` here on purpose: it wraps the child in an Align,
        // which grows to fill the loose constraints a Wrap hands out, so every
        // chip came out the full width of the screen. The padding gives the h-8
        // size instead, the way px-3 and text-xs do on the web.
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            gradient: active ? Brand.gradient : null,
            borderRadius: BorderRadius.circular(16),
            border: active
                ? null
                : Border.all(color: const Color(0xFFD1D5DB), width: 2),
            boxShadow: const [
              BoxShadow(
                  color: Color(0x14000000), blurRadius: 8, offset: Offset(0, 2)),
            ],
          ),
          child: Text(
            tab,
            style: TextStyle(
              fontSize: 12, // text-xs
              height: 16 / 12,
              fontWeight: FontWeight.w600,
              color: active ? Colors.white : const Color(0xFF4B5563),
            ),
          ),
        ),
      ),
    );
  }

  Widget _empty() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Column(
        children: [
          Image.asset(
            'assets/images/delivery.png',
            height: 240,
            fit: BoxFit.contain,
          ),
          const SizedBox(height: 20),
          const Text(
            'No orders yet.',
            style: TextStyle(
              fontFamily: 'Montserrat',
              fontSize: 19,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            "Tap 'Book Now' to place your first order.",
            textAlign: TextAlign.center,
            style: TextStyle(color: Brand.mutedForeground, fontSize: 14.5),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: 200,
            child: GradientButton(
              label: 'Book Now',
              height: 48,
              onPressed: () =>
                  Navigator.of(context).pushReplacementNamed('/prices'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _orderCard(CustomerOrder order) {
    final gradient = order.status == 'delivered'
        ? const LinearGradient(colors: [Color(0xFF10B981), Color(0xFF059669)])
        : order.status == 'cancelled'
            ? const LinearGradient(colors: [Color(0xFFEF4444), Color(0xFFDC2626)])
            : Brand.gradient;

    final placed = order.createdAt == null
        ? ''
        : DateFormat('dd MMM yyyy, hh:mm a').format(order.createdAt!);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Brand.border, width: 2),
        boxShadow: const [
          BoxShadow(color: Color(0x14000000), blurRadius: 12, offset: Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                height: 38,
                width: 38,
                decoration: BoxDecoration(
                  gradient: Brand.gradient,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.dry_cleaning,
                    color: Colors.white, size: 19),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Order #${order.orderId}',
                      style: const TextStyle(
                          fontWeight: FontWeight.w700, fontSize: 14.5),
                    ),
                    const SizedBox(height: 1),
                    Text(
                      order.itemsText,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12.5, color: Brand.mutedForeground),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  gradient: gradient,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  order.statusLabel,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Text(
                  placed,
                  style: const TextStyle(fontSize: 12.5, color: Brand.mutedForeground),
                ),
              ),
              GradientText(
                rupees(order.totalAmount),
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  fontFamily: 'Montserrat',
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              GestureDetector(
                onTap: () => Navigator.of(context).pushNamed(
                  '/order-details',
                  arguments: {'orderId': order.orderId},
                ),
                child: const GradientText(
                  'View Order',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                ),
              ),
              const SizedBox(width: 18),
              GestureDetector(
                onTap: () => Navigator.of(context).pushNamed(
                  '/rate-order',
                  arguments: {'orderId': order.orderId},
                ),
                child: const GradientText(
                  'Rate Service',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
