import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/order.dart';
import '../services/api.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/common.dart';
import '../utils/dates.dart';
import '../widgets/bottom_nav.dart';

/// `app/hub/delivered/page.tsx` -- what this captain has already handed over,
/// searchable by order id or customer name.
class HubDeliveredScreen extends StatefulWidget {
  const HubDeliveredScreen({super.key});

  @override
  State<HubDeliveredScreen> createState() => _HubDeliveredScreenState();
}

class _HubDeliveredScreenState extends State<HubDeliveredScreen> {
  final _search = TextEditingController();
  List<PartnerOrder> _all = const [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final partnerId = Store.partnerId;
    if (partnerId == null) return;

    final result = await Api.allOrders();
    if (!mounted) return;
    setState(() {
      if (result.ok) {
        _all = result.list
            .whereType<Map>()
            .map((o) => PartnerOrder(Map<String, dynamic>.from(o)))
            .where((o) =>
                o.partnerId == partnerId && o.status == 'delivered_to_hub')
            .toList();
      }
      _loading = false;
    });
  }

  List<PartnerOrder> get _visible {
    final query = _search.text.trim().toLowerCase();
    if (query.isEmpty) return _all;
    return _all
        .where((o) =>
            o.orderId.toLowerCase().contains(query) ||
            o.customerName.toLowerCase().contains(query))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final visible = _visible;
    return Scaffold(
      bottomNavigationBar: const PartnerBottomNav(current: NavTab.hub),
      backgroundColor: Brand.gray50,
      appBar: AppHeader(
        title: 'Delivered to Hub',
        onBack: () => Navigator.of(context)
            .pushNamedAndRemoveUntil('/hub/drop', (r) => false),
        // A bare emoji in the web header, with nothing behind it.
        trailing: const Align(
          alignment: Alignment.centerRight,
          child: Text('\u{1F53D}', style: TextStyle(fontSize: 16)),
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.only(bottom: 40), // pb-10
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _search,
                      onChanged: (_) => setState(() {}),
                      style: const TextStyle(
                          fontSize: 14,
                          height: Brand.leadSm,
                          color: Colors.black),
                      decoration: InputDecoration(
                        hintText: 'Search by Order ID / Customer',
                        filled: true,
                        fillColor: Brand.surface,
                        isDense: false,
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 12),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(Brand.rXl),
                          borderSide: const BorderSide(color: Brand.gray300),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(Brand.rXl),
                          borderSide:
                              const BorderSide(color: Brand.purple, width: 2),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8), // gap-2
                  // h-10 w-10 bordered square. It has no handler in the web
                  // app either -- it is there and does nothing.
                  Container(
                    height: 40,
                    width: 40,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(Brand.rXl),
                      border: Border.all(color: Brand.gray300),
                    ),
                    child:
                        const Text('\u{1F53D}', style: TextStyle(fontSize: 16)),
                  ),
                ],
              ),
            ),
            if (_loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 32),
                child: Center(
                  child: Text('Loading...',
                      style: TextStyle(color: Brand.gray500)),
                ),
              )
            else if (visible.isEmpty)
              _empty()
            else
              for (final order in visible)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                  child: _card(order),
                ),
          ],
        ),
      ),
    );
  }

  Widget _card(PartnerOrder order) {
    final at = parseDate((order.raw['deliveredToHubAt'] ?? '').toString());

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Brand.surface,
        borderRadius: BorderRadius.circular(Brand.rXl),
        border: Border.all(color: Brand.gray200),
        boxShadow: const [
          BoxShadow(
              color: Color(0x14000000), blurRadius: 6, offset: Offset(0, 1)),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      '#${order.orderId}',
                      style: const TextStyle(
                        fontFamily: Brand.heading,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.black,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: order.expressDelivery
                            ? const Color(0xFFFEF3C7)
                            : Brand.gray100,
                        borderRadius: BorderRadius.circular(Brand.rLg),
                      ),
                      child: Text(
                        order.expressDelivery
                            ? 'Express Delivery'
                            : 'Standard Delivery',
                        style: TextStyle(
                          fontSize: 12,
                          height: Brand.leadXs,
                          fontWeight: FontWeight.bold,
                          color: order.expressDelivery
                              ? const Color(0xFFD97706)
                              : Brand.gray600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(order.customerName,
                    style: const TextStyle(
                        fontSize: 14,
                        height: Brand.leadSm,
                        color: Brand.gray700)),
                const SizedBox(height: 4),
                Text(
                  '${order.items.length} items • ${rupees(order.totalAmount)}',
                  style: const TextStyle(
                      fontSize: 12, height: Brand.leadXs, color: Colors.black),
                ),
                const SizedBox(height: 8),
                Text(
                  'Delivered: ${at == null ? 'N/A' : DateFormat('dd MMM, hh:mm a').format(at.toLocal())}',
                  style: const TextStyle(
                      fontSize: 12, height: Brand.leadXs, color: Brand.gray600),
                ),
                const SizedBox(height: 8),
                Text(
                  'Status: ${_titleCase(order.status)}',
                  style: const TextStyle(
                    fontSize: 12,
                    height: Brand.leadXs,
                    fontWeight: FontWeight.w600,
                    color: Brand.purple,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: _statusColour(order.status),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              _statusLabel(order.status),
              style: const TextStyle(
                fontSize: 12,
                height: Brand.leadXs,
                fontWeight: FontWeight.w600,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _empty() => Padding(
        padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
        child: Column(
          children: [
            // Same picture, declared 260x180, really 260x224 (see
            // delivery_history.dart).
            Image.asset(
              'assets/images/delivery.png',
              width: 260,
              height: 224,
              fit: BoxFit.cover,
            ),
            const SizedBox(height: 8),
            const Text(
              'No delivered orders found.',
              style: TextStyle(
                fontFamily: Brand.heading,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            const Text(
              'Orders you deliver to hub will appear here.',
              style: TextStyle(
                  fontSize: 12, height: Brand.leadXs, color: Colors.black),
            ),
          ],
        ),
      );

  static Color _statusColour(String status) => switch (status) {
        'delivered' => const Color(0xFF22C55E),
        'ready' => const Color(0xFF3B82F6),
        'out_for_delivery' => const Color(0xFFA855F7),
        'delivered_to_hub' => const Color(0xFFF97316),
        'delivery_failed' => Brand.red500,
        _ => const Color(0xFF6B7280),
      };

  static String _statusLabel(String status) => switch (status) {
        'delivered' => 'Delivered',
        'ready' => 'Ready',
        'out_for_delivery' => 'Out for Delivery',
        'delivered_to_hub' => 'At Hub',
        'delivery_failed' => 'Failed',
        _ => _titleCase(status),
      };

  static String _titleCase(String value) => value
      .replaceAll('_', ' ')
      .split(' ')
      .where((w) => w.isNotEmpty)
      .map((w) => '${w[0].toUpperCase()}${w.substring(1)}')
      .join(' ');
}
