import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/order.dart';
import '../services/api.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/common.dart';
import '../utils/dates.dart';

/// `app/delivery/pick/page.tsx` -- orders the hub has finished, waiting to be
/// taken out.
///
/// An order qualifies when it is `process_completed` and either its pickup or
/// its delivery pincode is one of the captain's. Ticking some and confirming
/// opens the first of them; the rest stay ticked for the trip.
class DeliveryPickScreen extends StatefulWidget {
  const DeliveryPickScreen({super.key});

  @override
  State<DeliveryPickScreen> createState() => _DeliveryPickScreenState();
}

class _DeliveryPickScreenState extends State<DeliveryPickScreen> {
  List<PartnerOrder> _orders = const [];
  PartnerOrder? _active;
  final Set<String> _selected = {};

  bool _loading = true;
  bool _refreshing = false;
  DateTime _now = DateTime.now();
  Timer? _tick;

  @override
  void initState() {
    super.initState();
    _checkKyc();
    _tick = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) setState(() => _now = DateTime.now());
    });
  }

  @override
  void dispose() {
    _tick?.cancel();
    super.dispose();
  }

  Future<void> _checkKyc() async {
    final partnerId = Store.partnerId;
    if (partnerId == null) {
      if (mounted) {
        Navigator.of(context).pushNamedAndRemoveUntil('/login', (r) => false);
      }
      return;
    }
    final result = await Api.partner(partnerId);
    if (!mounted) return;
    if (!result.ok) {
      setState(() => _loading = false);
      return;
    }
    final status = (result.map['kycStatus'] ?? '').toString();
    if (status != 'approved') {
      Navigator.of(context)
          .pushNamedAndRemoveUntil('/profile/kyc-details', (r) => false);
      return;
    }
    await _fetch();
  }

  Future<void> _fetch() async {
    final partnerId = Store.partnerId;
    if (partnerId == null) return;

    final partnerResult = await Api.partner(partnerId);
    if (!mounted) return;
    if (!partnerResult.ok) {
      setState(() => _loading = false);
      return;
    }

    final partner = partnerResult.map;
    final pincodes = <String>{};
    if (partner['address'] is Map) {
      final pin = ((partner['address'] as Map)['pincode'] ?? '').toString();
      if (pin.isNotEmpty) pincodes.add(pin);
    }
    if (partner['pincodes'] is List) {
      pincodes.addAll((partner['pincodes'] as List).map((p) => p.toString()));
    }

    if (pincodes.isEmpty) {
      setState(() {
        _orders = const [];
        _loading = false;
      });
      return;
    }

    final result = await Api.allOrders();
    if (!mounted) return;
    if (!result.ok) {
      setState(() => _loading = false);
      return;
    }

    final all = result.list
        .whereType<Map>()
        .map((o) => PartnerOrder(Map<String, dynamic>.from(o)))
        .toList();

    PartnerOrder? active;
    for (final order in all) {
      if (order.partnerId == partnerId && order.status == 'out_for_delivery') {
        active = order;
        break;
      }
    }

    final ready = all.where((order) {
      if (order.status != 'process_completed') return false;
      final pickupPin = order.pickupAddress.pincode;
      final deliveryPin = order.deliveryAddress.pincode;
      return (pickupPin.isNotEmpty && pincodes.contains(pickupPin)) ||
          (deliveryPin.isNotEmpty && pincodes.contains(deliveryPin));
    }).toList();

    setState(() {
      _active = active;
      _orders = ready;
      _selected.removeWhere((id) => !ready.any((o) => o.id == id));
      _loading = false;
    });
  }

  Future<void> _refresh() async {
    setState(() => _refreshing = true);
    await _fetch();
    if (mounted) setState(() => _refreshing = false);
  }

  void _confirm() {
    if (_selected.isEmpty) {
      showToast(context, 'Please select at least one order',
          kind: ToastKind.warning);
      return;
    }
    Navigator.of(context).pushNamed(
      '/delivery/details',
      arguments: {'id': _selected.first},
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Brand.gray50,
      bottomNavigationBar:
          const PartnerBottomNav(current: NavTab.pickForDelivery),
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            _header(),
            if (_active != null) _activeBar(_active!),
            Expanded(
              child: RefreshIndicator(
                color: Brand.purple,
                onRefresh: _refresh,
                child: ListView(
                  padding: const EdgeInsets.only(bottom: 24),
                  children: [
                    if (_refreshing)
                      const Padding(
                        padding: EdgeInsets.only(top: 12),
                        child: Center(
                          child: SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Brand.purple),
                          ),
                        ),
                      ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                      child: Text(
                        'Select Orders to Deliver (${_orders.length})',
                        style: const TextStyle(
                          fontFamily: Brand.heading,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Colors.black,
                        ),
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
                    else if (_orders.isEmpty)
                      const Padding(
                        padding: EdgeInsets.fromLTRB(16, 24, 16, 0),
                        child: Column(
                          children: [
                            Text(
                              'No orders available for delivery.',
                              style: TextStyle(
                                fontFamily: Brand.heading,
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            SizedBox(height: 4),
                            Text(
                              'Orders ready for delivery in your area will appear here.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                  fontSize: 12,
                                  height: Brand.leadXs,
                                  color: Brand.gray600),
                            ),
                          ],
                        ),
                      )
                    else
                      for (final order in _orders)
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                          child: _card(order),
                        ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
                      child: GradientButton(
                        label: 'Confirm Selection (${_selected.length})',
                        height: 42, // py-3 around text-base at 12px
                        radius: Brand.rXl,
                        onPressed: _orders.isEmpty ? null : _confirm,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _header() {
    return Material(
      color: Brand.surface,
      elevation: 1,
      shadowColor: Colors.black12,
      child: Column(
        children: [
          const SizedBox(
            height: 48,
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Pick for Delivery',
                  style: TextStyle(
                    fontFamily: Brand.heading,
                    fontSize: Brand.h2, // <h2>
                    fontWeight: FontWeight.w600,
                    color: Colors.black,
                  ),
                ),
              ),
            ),
          ),
          Container(
            width: double.infinity,
            decoration: const BoxDecoration(gradient: Brand.gradient),
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: const Text(
              'Orders ready at Main Processing Hub',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                height: Brand.leadSm,
                fontWeight: FontWeight.w600,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _activeBar(PartnerOrder order) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => Navigator.of(context)
            .pushNamed('/delivery/details', arguments: {'id': order.id}),
        child: Ink(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFFF59E0B), Color(0xFFD97706)],
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                Container(
                  height: 32,
                  width: 32,
                  decoration: const BoxDecoration(
                    // `bg-white bg-opacity-25`: Tailwind v4 dropped the
                    // bg-opacity-* utilities, so the class does nothing and
                    // the circle is solid white.
                    color: Colors.white,
                    shape: BoxShape.circle,
                  ),
                  child: const Center(
                    child: Text('\u{1F69A}', style: TextStyle(fontSize: 15)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Delivery in Progress',
                        style: TextStyle(
                          fontSize: 14,
                          height: Brand.leadSm,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      Text(
                        'Order #${order.orderId} - Tap to continue',
                        style: TextStyle(
                          fontSize: 12,
                          height: Brand.leadXs,
                          color: Colors.white.withValues(alpha: 0.9),
                        ),
                      ),
                    ],
                  ),
                ),
                const Text('→',
                    style: TextStyle(fontSize: 20, color: Colors.white)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _card(PartnerOrder order) {
    final selected = _selected.contains(order.id);
    final paid = order.paymentStatus == 'paid';
    final expected =
        parseDate((order.raw['expectedDeliveryAt'] ?? '').toString());
    final slotDate = parseDate(order.deliverySlotDate);

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
                Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(
                      'Order ID: #${order.orderId}',
                      style: const TextStyle(
                        fontSize: 14,
                        height: Brand.leadSm,
                        fontWeight: FontWeight.w600,
                        color: Colors.black,
                      ),
                    ),
                    if (order.redeliveryScheduled)
                      _tag('REDELIVERY', const Color(0xFFFEF3C7),
                          const Color(0xFF92400E)),
                    if (order.expressDelivery)
                      _tag('Express Delivery', const Color(0xFFFEF3C7),
                          const Color(0xFFD97706)),
                  ],
                ),
                if (expected != null) ...[
                  const SizedBox(height: 4),
                  if (order.expressDelivery)
                    _countdown(expected)
                  else
                    Text(
                      '⏳ Deliver by: '
                      '${DateFormat('dd MMM, h:mm a').format(expected.toLocal())}',
                      style: const TextStyle(
                        fontSize: 12,
                        height: Brand.leadXs,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFFD97706),
                      ),
                    ),
                ],
                if (slotDate != null || order.deliverySlotTime.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      border: Border.all(color: const Color(0xFFDBEAFE)),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      '\u{1F4C5} Delivery: '
                      '${slotDate == null ? '' : DateFormat('dd/MM/yyyy').format(slotDate.toLocal())}'
                      ' | ${order.deliverySlotTime}',
                      style: const TextStyle(
                        fontSize: 12,
                        height: Brand.leadXs,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1E40AF),
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 8),
                Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: paid
                            ? '✓ Paid'
                            : 'Collect ${rupees(order.totalAmount)}',
                        style: TextStyle(
                          fontSize: 12,
                          height: Brand.leadXs,
                          fontWeight: FontWeight.bold,
                          color: paid
                              ? const Color(0xFF15803D)
                              : const Color(0xFFB91C1C),
                        ),
                      ),
                      TextSpan(
                        text:
                            ' · ${order.paymentMethod.isEmpty ? 'Cash on Delivery' : order.paymentMethod}',
                        style: const TextStyle(
                            fontSize: 12,
                            height: Brand.leadXs,
                            color: Brand.gray500),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                _line('Customer: ', order.customerName),
                const SizedBox(height: 4),
                _line(
                  'Items: ',
                  order.items.map((i) => '${i.quantity} ${i.name}').join(', '),
                ),
                const SizedBox(height: 4),
                _line('Address: ', order.deliveryAddress.shortLine),
              ],
            ),
          ),
          const SizedBox(width: 12),
          GestureDetector(
            onTap: () => setState(() {
              if (selected) {
                _selected.remove(order.id);
              } else {
                _selected.add(order.id);
              }
            }),
            child: Container(
              height: 32,
              width: 32,
              decoration: BoxDecoration(
                gradient: selected ? Brand.gradient : null,
                borderRadius: BorderRadius.circular(Brand.rLg),
                border: Border.all(
                  color: selected ? Brand.purple : Brand.inputBorder,
                  width: 2,
                ),
              ),
              child: selected
                  ? const Center(
                      child: Text('✔',
                          style: TextStyle(
                              fontSize: 14,
                              height: Brand.leadSm,
                              color: Colors.white)),
                    )
                  : null,
            ),
          ),
          // A bare emoji beside the box, as in the web app -- it is not a
          // control there either.
          const SizedBox(width: 12), // gap-3
          const Text('\u{2139}\u{FE0F}',
              style: TextStyle(fontSize: 16, color: Brand.purple)),
        ],
      ),
    );
  }

  Widget _tag(String text, Color background, Color foreground) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(4),
        ),
        child: Text(
          text,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: foreground,
          ),
        ),
      );

  Widget _line(String label, String value) => Text.rich(
        TextSpan(
          style: const TextStyle(
              fontSize: 12, height: Brand.leadXs, color: Brand.gray600),
          children: [
            TextSpan(text: label),
            TextSpan(text: value, style: const TextStyle(color: Colors.black)),
          ],
        ),
      );

  Widget _countdown(DateTime expected) {
    final diff = expected.difference(_now);
    final overdue = diff.isNegative;
    final abs = diff.abs();
    final hours = abs.inHours;
    final minutes = abs.inMinutes % 60;
    final text = '$hours hour${hours != 1 ? 's' : ''} '
        '$minutes minute${minutes != 1 ? 's' : ''}';
    return Text(
      '⏳ ${overdue ? 'Overdue by $text' : '$text left'}',
      style: TextStyle(
        fontSize: 12,
        height: Brand.leadXs,
        fontWeight: FontWeight.bold,
        color: overdue ? Brand.red600 : const Color(0xFFD97706),
      ),
    );
  }
}
