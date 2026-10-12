import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/order.dart';
import '../services/api.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/address_map.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/common.dart';
import '../utils/dates.dart';

/// `app/hub/drop/page.tsx` -- everything the captain is carrying, and the hub
/// to take it to.
///
/// The list holds two different things. Orders that were picked up go to the
/// hub as `delivered_to_hub`. Orders that came back because a delivery failed
/// do not: they raise a return request for the admin to approve, and a failure
/// on a redelivery raises the redelivery flavour of it.
///
/// Two behaviours are carried over from the web screen rather than corrected
/// (CLAUDE.md 9.3): with nothing ticked the button acts on **every** order in
/// the list, and the result of each call is not checked, so the success toast
/// appears whether or not the server accepted it.
class HubDropScreen extends StatefulWidget {
  const HubDropScreen({super.key});

  @override
  State<HubDropScreen> createState() => _HubDropScreenState();
}

class _HubDropScreenState extends State<HubDropScreen> {
  Map<String, dynamic>? _hub;
  List<PartnerOrder> _orders = const [];
  List<PartnerOrder> _deliveredToHub = const [];
  final Set<String> _selected = {};

  bool _loading = true;
  bool _refreshing = false;
  bool _dropping = false;
  DateTime _now = DateTime.now();
  Timer? _tick;

  @override
  void initState() {
    super.initState();
    _checkKyc();
    // The express countdown is live, so the screen re-reads the clock.
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
    if (status == 'rejected') {
      Navigator.of(context)
          .pushNamedAndRemoveUntil('/profile/kyc', (r) => false);
      return;
    }
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
    if (mounted) setState(() => _loading = true);

    final partnerResult = await Api.partner(partnerId);
    final partnerPincode = partnerResult.ok &&
            partnerResult.map['address'] is Map
        ? ((partnerResult.map['address'] as Map)['pincode'] ?? '').toString()
        : '';

    // The hub nearest the captain's own pincode, and any active hub if that
    // finds nothing -- the captain still has to drop the clothes somewhere.
    Map<String, dynamic>? hub;
    if (partnerPincode.isNotEmpty) {
      final byPincode = await Api.hubsForPincode(partnerPincode);
      if (byPincode.ok && byPincode.list.isNotEmpty) {
        hub = Map<String, dynamic>.from(byPincode.list.first as Map);
      }
    }
    if (hub == null) {
      final any = await Api.hubs();
      if (any.ok && any.list.isNotEmpty) {
        hub = Map<String, dynamic>.from(any.list.first as Map);
      }
    }

    final ordersResult = await Api.allOrders();
    if (!mounted) return;

    final all = ordersResult.list
        .whereType<Map>()
        .map((o) => PartnerOrder(Map<String, dynamic>.from(o)))
        .toList();

    final mine = all.where((o) => o.partnerId == partnerId);

    final carrying = mine.where((o) {
      final pickedUp = o.status == 'picked_up';
      final failed = o.status == 'delivery_failed' &&
          !o.redeliveryScheduled &&
          !o.returnToHubApproved;
      final redeliveryFailed = o.status == 'delivery_failed' &&
          o.redeliveryScheduled &&
          o.raw['redeliveryReturnApproved'] != true;
      return pickedUp || failed || redeliveryFailed;
    }).toList();

    setState(() {
      _hub = hub;
      _orders = carrying;
      _deliveredToHub =
          mine.where((o) => o.status == 'delivered_to_hub').toList();
      _selected.removeWhere((id) => !carrying.any((o) => o.id == id));
      _loading = false;
    });
  }

  Future<void> _refresh() async {
    setState(() => _refreshing = true);
    await _fetch();
    if (mounted) setState(() => _refreshing = false);
  }

  Future<void> _drop() async {
    if (_orders.isEmpty || _dropping) return;
    setState(() => _dropping = true);

    // With nothing ticked this acts on everything in the list -- the web
    // screen's behaviour, kept.
    final targets = _selected.isNotEmpty
        ? _orders.where((o) => _selected.contains(o.id)).toList()
        : _orders;

    var hadFailed = false;
    var hadRedeliveryFailed = false;

    for (final order in targets) {
      if (order.status == 'delivery_failed') {
        hadFailed = true;
        final isRedelivery = order.redeliveryScheduled;
        if (isRedelivery) hadRedeliveryFailed = true;

        // The fee is the admin's configured one unless the order already
        // carries a figure.
        num fee = order.raw['deliveryFailureFee'] is num
            ? order.raw['deliveryFailureFee'] as num
            : 0;
        if (fee == 0) {
          final charges = await Api.orderCharges();
          if (charges.ok) {
            fee = charges.map['deliveryFailureFee'] is num
                ? charges.map['deliveryFailureFee'] as num
                : 0;
          }
        }

        await Api.patchOrder(order.id, {
          'returnToHubRequested': true,
          'returnToHubRequestedAt': DateTime.now().toIso8601String(),
          'deliveryFailureFee': fee,
          'hub': _hub?['_id'],
          if (isRedelivery) ...{
            'redeliveryReturnRequested': true,
            'redeliveryReturnRequestedAt': DateTime.now().toIso8601String(),
          },
        });
      } else {
        await Api.patchOrder(order.id, {
          'status': 'delivered_to_hub',
          'deliveredToHubAt': DateTime.now().toIso8601String(),
          'hub': _hub?['_id'],
        });
      }
    }

    if (!mounted) return;
    setState(() => _dropping = false);

    showToast(
      context,
      hadFailed
          ? (hadRedeliveryFailed
              ? 'Redelivery return request sent to admin'
              : 'Return request sent to admin for approval')
          : 'Orders delivered to hub successfully',
      kind: ToastKind.success,
    );

    await Future<void>.delayed(const Duration(milliseconds: 1500));
    if (!mounted) return;
    Navigator.of(context).pushNamed('/hub/delivered');
  }

  @override
  Widget build(BuildContext context) {
    final count = _selected.isNotEmpty ? _selected.length : _orders.length;

    return Scaffold(
      backgroundColor: Brand.gray50,
      bottomNavigationBar: const PartnerBottomNav(current: NavTab.hub),
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            const Material(
              color: Brand.surface,
              elevation: 1,
              shadowColor: Colors.black12,
              child: SizedBox(
                height: 48,
                child: Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      'Drop To Hub',
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
            ),
            _deliveredBanner(),
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
                    if (_hub != null) _hubMap(),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                      child: Text(
                        'Orders to Drop (${_orders.length})',
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
                        padding: EdgeInsets.symmetric(vertical: 48),
                        child: Column(
                          children: [
                            SizedBox(
                              height: 48,
                              width: 48,
                              child: CircularProgressIndicator(
                                  strokeWidth: 4, color: Color(0xFF10B981)),
                            ),
                            SizedBox(height: 16),
                            Text('Loading orders...',
                                style: TextStyle(color: Brand.gray500)),
                          ],
                        ),
                      )
                    else if (_orders.isEmpty)
                      _empty()
                    else
                      for (final order in _orders)
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                          child: _card(order),
                        ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
                      child: GradientButton(
                        label: 'Drop to Hub ($count)',
                        height: 42, // py-3 around text-base at 12px
                        radius: Brand.rXl,
                        busy: _dropping,
                        onPressed: _orders.isEmpty || _dropping ? null : _drop,
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

  Widget _deliveredBanner() {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => Navigator.of(context).pushNamed('/hub/delivered'),
        child: Ink(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF10B981), Color(0xFF059669)],
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
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
                    child: Text('✅', style: TextStyle(fontSize: 15)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Orders Delivered to Hub',
                        style: TextStyle(
                          fontSize: 14,
                          height: Brand.leadSm,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      Text(
                        _deliveredToHub.isEmpty
                            ? 'Tap to view details'
                            : '${_deliveredToHub.length} order(s) • Tap to view details',
                        style: TextStyle(
                          fontSize: 12,
                          height: Brand.leadXs,
                          color: Colors.white.withValues(alpha: 0.9),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _hubMap() {
    final hub = _hub!;
    final address = OrderAddress(hub['address']);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: SizedBox(
        height: 192, // h-48
        child: Stack(
          children: [
            Positioned.fill(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(Brand.rXl),
                child: AddressMap(
                  address: address,
                  raw: hub['address'] is Map
                      ? Map<String, dynamic>.from(hub['address'] as Map)
                      : null,
                  height: 192,
                  borderRadius: Brand.rXl,
                ),
              ),
            ),
            Positioned(
              left: 16,
              bottom: 16,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: Brand.surface,
                  borderRadius: BorderRadius.circular(Brand.rXl),
                  boxShadow: const [
                    BoxShadow(color: Color(0x14000000), blurRadius: 6),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      (hub['name'] ?? '').toString(),
                      style: const TextStyle(
                        fontSize: 14,
                        height: Brand.leadSm,
                        fontWeight: FontWeight.w600,
                        color: Colors.black,
                      ),
                    ),
                    GestureDetector(
                      onTap: () => launchUrl(
                        Uri.parse(
                            'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent('${address.street}, ${address.city}')}'),
                        mode: LaunchMode.externalApplication,
                      ),
                      child: const Text(
                        'Open in Google Maps',
                        style: TextStyle(
                            fontSize: 12,
                            height: Brand.leadXs,
                            color: Brand.purple),
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

  Widget _card(PartnerOrder order) {
    final failed = order.status == 'delivery_failed';
    final expected =
        parseDate((order.raw['expectedDeliveryAt'] ?? '').toString());

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
          SizedBox(
            height: 20,
            width: 20,
            child: Checkbox(
              value: _selected.contains(order.id),
              activeColor: Brand.purple,
              onChanged: (value) => setState(() {
                if (value == true) {
                  _selected.add(order.id);
                } else {
                  _selected.remove(order.id);
                }
              }),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        'Order ID: #${order.orderId}',
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
                const SizedBox(height: 4),
                Text('${order.items.length} items',
                    style: const TextStyle(
                        fontSize: 12,
                        height: Brand.leadXs,
                        color: Colors.black)),
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
                const SizedBox(height: 4),
                Text(
                  failed
                      ? (order.redeliveryScheduled
                          ? '⚠ Redelivery Failed'
                          : '⚠ Delivery Failed')
                      : 'Picked Up',
                  style: TextStyle(
                    fontSize: 12,
                    height: Brand.leadXs,
                    color: failed ? Brand.red600 : Brand.purple,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(order.customerName,
              style: const TextStyle(
                  fontSize: 14, height: Brand.leadSm, color: Colors.black)),
        ],
      ),
    );
  }

  /// Express orders carry a 12-hour promise, so the time left is live and
  /// turns red once it has run out.
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

  Widget _empty() => Padding(
        // mt-12 px-6, and nothing underneath: the mt-5 above the button is the
        // only gap between this and it.
        padding: const EdgeInsets.fromLTRB(24, 48, 24, 0),
        child: Column(
          children: [
            Container(
              height: 128,
              width: 128,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF10B981), Color(0xFF059669)],
                ),
                shape: BoxShape.circle,
              ),
              child: const Center(
                child: Text('\u{1F4E6}', style: TextStyle(fontSize: 60)),
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'All Clear!',
              style: TextStyle(
                fontFamily: Brand.heading,
                fontSize: Brand.h3, // <h3>
                fontWeight: FontWeight.w500,
                color: Brand.gray900,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'No orders ready to drop at the hub right now. Orders will '
              'appear here after you complete pickups.',
              textAlign: TextAlign.center,
              style: TextStyle(
                  fontSize: 14, height: Brand.leadSm, color: Brand.gray600),
            ),
          ],
        ),
      );
}
