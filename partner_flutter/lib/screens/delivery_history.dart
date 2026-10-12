import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/order.dart';
import '../services/api.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/common.dart';
import '../utils/dates.dart';

/// `app/delivery/history/page.tsx` -- everything this captain has finished,
/// delivered or not, with the same two filters the web screen has: the status
/// pair at the top and the date range underneath.
class DeliveryHistoryScreen extends StatefulWidget {
  const DeliveryHistoryScreen({super.key});

  @override
  State<DeliveryHistoryScreen> createState() => _DeliveryHistoryScreenState();
}

enum _DateFilter { all, thisWeek, lastWeek, thisMonth }

class _DeliveryHistoryScreenState extends State<DeliveryHistoryScreen> {
  final _search = TextEditingController();
  List<PartnerOrder> _all = const [];

  /// 'all' until a tab is tapped, exactly as the web screen starts: both tabs
  /// show their grey gradient and the list carries delivered and failed
  /// deliveries together. Neither tab ever goes back to 'all'.
  String _status = 'all';
  _DateFilter _date = _DateFilter.all;
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
                o.partnerId == partnerId &&
                (o.status == 'delivered' || o.status == 'delivery_failed'))
            .toList();
      }
      _loading = false;
    });
  }

  /// The timestamp a row is filtered and sorted by: when it was delivered, or
  /// when the delivery failed.
  DateTime? _completedAt(PartnerOrder order) =>
      parseDate((order.raw['deliveredAt'] ?? '').toString()) ??
      parseDate((order.raw['deliveryFailedAt'] ?? '').toString());

  List<PartnerOrder> get _visible {
    var list = _all.where((o) => switch (_status) {
          'delivered' => o.status == 'delivered',
          'undelivered' => o.status == 'delivery_failed',
          _ => true,
        });

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    switch (_date) {
      case _DateFilter.thisWeek:
        final weekStart = today.subtract(Duration(days: now.weekday % 7));
        list = list.where((o) {
          final at = _completedAt(o);
          return at != null && !at.isBefore(weekStart);
        });
      case _DateFilter.lastWeek:
        final lastWeekStart =
            today.subtract(Duration(days: (now.weekday % 7) + 7));
        final lastWeekEnd = lastWeekStart.add(const Duration(days: 7));
        list = list.where((o) {
          final at = _completedAt(o);
          return at != null &&
              !at.isBefore(lastWeekStart) &&
              at.isBefore(lastWeekEnd);
        });
      case _DateFilter.thisMonth:
        final monthStart = DateTime(now.year, now.month);
        list = list.where((o) {
          final at = _completedAt(o);
          return at != null && !at.isBefore(monthStart);
        });
      case _DateFilter.all:
        break;
    }

    final query = _search.text.trim().toLowerCase();
    if (query.isNotEmpty) {
      list = list.where((o) =>
          o.orderId.toLowerCase().contains(query) ||
          o.customerName.toLowerCase().contains(query));
    }
    return list.toList();
  }

  @override
  Widget build(BuildContext context) {
    final visible = _visible;

    return Scaffold(
      backgroundColor: Brand.gray50,
      bottomNavigationBar: const PartnerBottomNav(current: NavTab.delivery),
      appBar: AppHeader(
        title: 'Delivery History',
        onBack: () => Navigator.of(context)
            .pushNamedAndRemoveUntil('/delivery/pick', (r) => false),
        // The web header's right-hand slot is a bare down-arrow emoji, not a
        // control: it opens nothing. Android paints it as an orange tile.
        trailing: const Align(
          alignment: Alignment.centerRight,
          child: Text('\u{1F53D}', style: TextStyle(fontSize: 16)),
        ),
      ),
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Row(
                children: [
                  Expanded(
                    child: _statusButton(
                      label: 'Delivered',
                      value: 'delivered',
                      colours: const [Color(0xFF10B981), Color(0xFF059669)],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _statusButton(
                      label: 'Undelivered',
                      value: 'undelivered',
                      colours: const [Brand.red500, Brand.red600],
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: TextField(
                controller: _search,
                onChanged: (_) => setState(() {}),
                style: const TextStyle(
                    fontSize: 14, height: Brand.leadSm, color: Colors.black),
                decoration: InputDecoration(
                  hintText: 'Search by Order ID or Customer',
                  filled: true,
                  fillColor: Brand.surface,
                  isDense: false,
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(Brand.rXl),
                    borderSide: const BorderSide(color: Brand.gray300),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(Brand.rXl),
                    borderSide: const BorderSide(color: Brand.purple, width: 2),
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _dateChip('All', _DateFilter.all),
                  _dateChip('This Week', _DateFilter.thisWeek),
                  _dateChip('Last Week', _DateFilter.lastWeek),
                  _dateChip('This Month', _DateFilter.thisMonth),
                ],
              ),
            ),
            if (_loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(
                  child: Text('Loading...',
                      style: TextStyle(color: Brand.gray500)),
                ),
              )
            else if (visible.isEmpty)
              _empty(context)
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

  Widget _statusButton({
    required String label,
    required String value,
    required List<Color> colours,
  }) {
    final active = _status == value;
    return SizedBox(
      height: 37, // py-2.5 around text-sm's line box at a button's 12px
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(Brand.rXl),
        elevation: 2,
        shadowColor: Colors.black26,
        child: InkWell(
          borderRadius: BorderRadius.circular(Brand.rXl),
          onTap: () => setState(() => _status = value),
          child: Ink(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: active
                    ? colours
                    : const [Color(0xFF9CA3AF), Color(0xFF6B7280)],
              ),
              borderRadius: BorderRadius.circular(Brand.rXl),
            ),
            child: Center(
              child: Text(
                label,
                style: const TextStyle(
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
    );
  }

  Widget _dateChip(String label, _DateFilter value) {
    final active = _date == value;
    return Material(
      color: active ? Colors.transparent : Brand.gray200,
      borderRadius: BorderRadius.circular(Brand.rLg),
      child: InkWell(
        borderRadius: BorderRadius.circular(Brand.rLg),
        onTap: () => setState(() => _date = value),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            gradient: active ? Brand.gradient : null,
            borderRadius: BorderRadius.circular(Brand.rLg),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              height: Brand.leadXs,
              fontWeight: FontWeight.w600,
              color: active ? Colors.white : Colors.black,
            ),
          ),
        ),
      ),
    );
  }

  Widget _card(PartnerOrder order) {
    final delivered = order.status == 'delivered';
    final at = parseDate((order.raw['deliveredAt'] ?? '').toString());

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
                    Flexible(
                      child: Text(
                        'Order #${order.orderId}',
                        style: const TextStyle(
                          fontSize: 14,
                          height: Brand.leadSm,
                          fontWeight: FontWeight.w600,
                          color: Colors.black,
                        ),
                      ),
                    ),
                    if (order.expressDelivery) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(Brand.rLg),
                        ),
                        child: const Text(
                          'Express Delivery',
                          style: TextStyle(
                            fontSize: 12,
                            height: Brand.leadXs,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFFD97706),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 8),
                Text.rich(
                  TextSpan(
                    style: const TextStyle(
                        fontSize: 12,
                        height: Brand.leadXs,
                        color: Brand.gray600),
                    children: [
                      TextSpan(text: '${order.customerName}, '),
                      TextSpan(
                        text: order.deliveryAddress.shortLine,
                        style: const TextStyle(color: Colors.black),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Delivered on: '
                  '${at == null ? 'N/A' : DateFormat('dd MMM, hh:mm a').format(at.toLocal())}',
                  style: const TextStyle(
                      fontSize: 12, height: Brand.leadXs, color: Brand.gray600),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: delivered ? const Color(0xFF22C55E) : Brand.red500,
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              delivered ? 'Delivered' : 'Undelivered',
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

  /// `min-height: calc(100vh - 300px)` with the block centred inside it, so
  /// the scooter sits well down the screen rather than under the filters.
  Widget _empty(BuildContext context) => ConstrainedBox(
        constraints: BoxConstraints(
          minHeight: MediaQuery.sizeOf(context).height - 300,
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // `Delivery.svg` is 200x172 with a square raster inside it, so a
            // declared 220x160 really draws 220x189 with the top and bottom of
            // the picture cropped away evenly. BoxFit.cover does exactly that.
            Image.asset(
              'assets/images/delivery.png',
              width: 220,
              height: 189,
              fit: BoxFit.cover,
            ),
            const SizedBox(height: 8), // mt-2
            const Text(
              'No delivery history yet.',
              style: TextStyle(
                fontSize: 16,
                height: Brand.leadBase,
                fontWeight: FontWeight.w600,
                color: Brand.gray800,
              ),
            ),
            const Text(
              'Completed orders will appear here.',
              style: TextStyle(
                  fontSize: 12, height: Brand.leadXs, color: Brand.gray600),
            ),
          ],
        ),
      );
}
