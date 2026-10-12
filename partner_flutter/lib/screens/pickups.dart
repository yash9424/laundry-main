import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/order.dart';
import '../services/api.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/address_map.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/common.dart';

/// `app/pickups/page.tsx` -- where a captain starts their day.
///
/// Three things happen here. KYC is checked, and anything but `approved` sends
/// them to the KYC screen. Any order already assigned to them that is still in
/// flight becomes the red "Active Pickup" bar. And the pool below is every
/// unclaimed pending order whose pickup pincode is one of theirs.
class PickupsScreen extends StatefulWidget {
  const PickupsScreen({super.key});

  @override
  State<PickupsScreen> createState() => _PickupsScreenState();
}

class _PickupsScreenState extends State<PickupsScreen> {
  List<PartnerOrder> _pickups = const [];
  PartnerOrder? _active;
  bool _loading = true;
  bool _refreshing = false;
  String? _starting;
  Timer? _auto;

  @override
  void initState() {
    super.initState();
    _checkKyc();
    // The web screen re-reads every 30 seconds so a new booking turns up
    // without the captain doing anything.
    _auto = Timer.periodic(const Duration(seconds: 30), (_) {
      if (!_loading && _starting == null) _fetch(refresh: true);
    });
  }

  @override
  void dispose() {
    _auto?.cancel();
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

  Future<void> _fetch({bool refresh = false}) async {
    if (!refresh && mounted) setState(() => _loading = true);

    final partnerId = Store.partnerId;
    if (partnerId == null) return;

    final partnerResult = await Api.partner(partnerId);
    if (!mounted) return;
    if (!partnerResult.ok) {
      setState(() => _loading = false);
      return;
    }

    final partner = partnerResult.map;
    final pincodes = <String>[
      if (partner['pincodes'] is List)
        ...(partner['pincodes'] as List).map((p) => p.toString()),
    ];
    if (pincodes.isEmpty) {
      final fallback = partner['address'] is Map
          ? (partner['address'] as Map)['pincode']?.toString() ?? ''
          : '';
      if (fallback.isNotEmpty) pincodes.add(fallback);
    }
    if (pincodes.isEmpty) {
      setState(() {
        _pickups = const [];
        _loading = false;
      });
      return;
    }

    // The pool of unclaimed orders is not something the server will filter, so
    // this is the one call that has to ask for everything.
    final result = await Api.allOrders();
    if (!mounted) return;
    if (!result.ok) {
      setState(() => _loading = false);
      return;
    }

    final orders = result.list
        .whereType<Map>()
        .map((o) => PartnerOrder(Map<String, dynamic>.from(o)))
        .toList();

    PartnerOrder? active;
    for (final order in orders) {
      const inFlight = {'pending', 'reached_location', 'picked_up'};
      if (order.partnerId == partnerId && inFlight.contains(order.status)) {
        active = order;
        break;
      }
    }

    final pending = orders.where((order) {
      return order.status == 'pending' &&
          pincodes.contains(order.pickupAddress.pincode) &&
          order.paymentStatus != 'failed' &&
          !order.hasPartner;
    }).toList();

    setState(() {
      _active = active;
      _pickups = pending;
      _loading = false;
    });
  }

  Future<void> _refresh() async {
    setState(() => _refreshing = true);
    await _fetch(refresh: true);
    if (mounted) setState(() => _refreshing = false);
  }

  /// Claiming an order.
  ///
  /// Carried over from the web app, including its race: the check and the
  /// assignment are two separate unconditioned calls, so two captains who tap
  /// at the same moment can both end up assigned and the second write wins
  /// (CLAUDE.md 9.3). Fixing it means a conditional update on the server,
  /// which the installed apps also depend on, so it is left alone here.
  Future<void> _start(PartnerOrder order) async {
    if (_starting != null) return;
    setState(() => _starting = order.id);

    final partnerId = Store.partnerId;
    final check = await Api.order(order.id);
    if (!mounted) return;

    final taken = PartnerOrder(check.map).partnerId;
    if (taken.isNotEmpty && taken != partnerId) {
      showToast(context, 'This order was just assigned to another partner',
          kind: ToastKind.warning);
      setState(() => _starting = null);
      await _fetch();
      return;
    }

    final assigned = await Api.patchOrder(order.id, {'partnerId': partnerId});
    if (!mounted) return;
    if (!assigned.ok) {
      showToast(context, 'Failed to assign order. Please try again.',
          kind: ToastKind.error);
      setState(() => _starting = null);
      return;
    }

    await Navigator.of(context)
        .pushNamed('/pickups/start', arguments: {'id': order.id});
    if (!mounted) return;
    setState(() => _starting = null);
    await _fetch(refresh: true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Brand.gray50,
      bottomNavigationBar: const PartnerBottomNav(current: NavTab.pickup),
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
                    if (_refreshing) _refreshingChip(),
                    _mapBanner(),
                    const SizedBox(height: 16),
                    if (_loading)
                      _loadingBlock()
                    else if (_pickups.isEmpty)
                      _emptyBlock()
                    else
                      for (final pickup in _pickups)
                        Padding(
                          padding:
                              const EdgeInsets.fromLTRB(16, 0, 16, 16), // gap-4
                          child: _card(pickup),
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
    return Container(
      width: double.infinity,
      color: Brand.surface,
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 16), // pt-6 pb-4
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text(
            "Today's Pickups",
            style: TextStyle(
              fontFamily: Brand.heading,
              fontSize: 20, // text-xl
              fontWeight: FontWeight.w700,
              color: Brand.gray900,
            ),
          ),
          InkWell(
            onTap: () => Navigator.of(context).pushNamed('/notifications'),
            customBorder: const CircleBorder(),
            child: Container(
              height: 40,
              width: 40,
              decoration: const BoxDecoration(
                color: Color(0xFFF0EBF8),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.notifications_none,
                  size: 20, color: Brand.purple),
            ),
          ),
        ],
      ),
    );
  }

  Widget _activeBar(PartnerOrder order) {
    return Material(
      color: Brand.red500,
      child: InkWell(
        onTap: () {
          switch (order.status) {
            case 'pending':
              Navigator.of(context)
                  .pushNamed('/pickups/start', arguments: {'id': order.id});
            case 'reached_location':
              Navigator.of(context)
                  .pushNamed('/pickups/confirm', arguments: {'id': order.id});
            case 'picked_up':
              Navigator.of(context).pushNamed('/hub/drop');
          }
        },
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              const Text('⚠️', style: TextStyle(fontSize: 18)),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Active Pickup in Progress',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    Text(
                      'Order #${order.orderId} - Tap to continue',
                      style: const TextStyle(fontSize: 12, color: Colors.white),
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
    );
  }

  Widget _refreshingChip() => Padding(
        padding: const EdgeInsets.only(top: 16, bottom: 4),
        child: Center(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: Brand.surface,
              borderRadius: BorderRadius.circular(999),
              boxShadow: const [
                BoxShadow(color: Color(0x1F000000), blurRadius: 10),
              ],
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  height: 16,
                  width: 16,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: Brand.purple),
                ),
                SizedBox(width: 8),
                Text('Refreshing...',
                    style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: Brand.purple)),
              ],
            ),
          ),
        ),
      );

  Widget _mapBanner() {
    final first = _pickups.isNotEmpty ? _pickups.first : null;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0), // mt-4 mx-4
      child: SizedBox(
        height: 160, // h-40
        child: Stack(
          children: [
            Positioned.fill(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(Brand.r2xl),
                child: first == null || first.pickupAddress.isEmpty
                    ? const NoLocationsMap()
                    : AddressMap(
                        address: first.pickupAddress,
                        raw: first.raw['pickupAddress'] is Map
                            ? Map<String, dynamic>.from(
                                first.raw['pickupAddress'] as Map)
                            : null,
                        height: 160,
                      ),
              ),
            ),
            Positioned(
              left: 16,
              top: 16,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: Brand.surface,
                  borderRadius: BorderRadius.circular(Brand.rXl),
                  boxShadow: const [
                    BoxShadow(color: Color(0x25000000), blurRadius: 10),
                  ],
                ),
                child: Text.rich(
                  TextSpan(
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Brand.gray900,
                    ),
                    children: [
                      TextSpan(
                        text: '${_pickups.length}',
                        style: const TextStyle(color: Brand.purple),
                      ),
                      const TextSpan(text: ' pickups today'),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _loadingBlock() => const Padding(
        padding: EdgeInsets.symmetric(vertical: 48),
        child: Column(
          children: [
            SizedBox(
              height: 48,
              width: 48,
              child: CircularProgressIndicator(
                  strokeWidth: 4, color: Brand.purple),
            ),
            SizedBox(height: 16),
            Text('Loading orders...', style: TextStyle(color: Brand.gray500)),
          ],
        ),
      );

  Widget _emptyBlock() => Padding(
        padding: const EdgeInsets.fromLTRB(24, 64, 24, 24), // mt-20 px-6
        child: Column(
          children: [
            Container(
              height: 128,
              width: 128,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Brand.purple, Brand.cyan],
                ),
                shape: BoxShape.circle,
              ),
              child: const Center(
                child: Text('\u{1F4E6}', style: TextStyle(fontSize: 60)),
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'No Orders Yet',
              style: TextStyle(
                fontFamily: Brand.heading,
                fontSize: 24,
                fontWeight: FontWeight.w700,
                color: Brand.gray900,
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'No customers have placed orders in your area. Orders will '
              'appear here when customers make bookings.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16, color: Brand.gray500),
            ),
          ],
        ),
      );

  Widget _card(PartnerOrder pickup) {
    final startable = _isStartable(pickup.pickupSlotDate);
    final starting = _starting == pickup.id;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Brand.surface,
        borderRadius: BorderRadius.circular(Brand.r2xl),
        border: Border.all(color: Brand.gray100),
        boxShadow: const [
          BoxShadow(
              color: Color(0x14000000), blurRadius: 10, offset: Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      pickup.customerName,
                      style: const TextStyle(
                        fontFamily: Brand.heading,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Brand.gray900,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '\u{1F4CD} ${pickup.pickupAddress.shortLine}',
                      style:
                          const TextStyle(fontSize: 14, color: Brand.gray600),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '\u{1F4C5} ${_displayDate(pickup.pickupSlotDate)} | '
                      '\u{1F550} ${pickup.pickupSlotTime.isEmpty ? 'Time not set' : pickup.pickupSlotTime}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: Brand.purple,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '⏳ SLA starts on pickup: '
                      '${pickup.expressDelivery ? '12hr' : '24hr'} turnaround',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFFD97706),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Brand.gray100,
                      borderRadius: BorderRadius.circular(Brand.rLg),
                    ),
                    child: Text(
                      '#${pickup.orderId}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Brand.gray500,
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: pickup.expressDelivery
                          ? const Color(0xFFFEF3C7)
                          : Brand.gray100,
                      borderRadius: BorderRadius.circular(Brand.rLg),
                    ),
                    child: Text(
                      pickup.expressDelivery
                          ? 'Express Delivery'
                          : 'Standard Delivery',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: pickup.expressDelivery
                            ? const Color(0xFFD97706)
                            : Brand.gray600,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12), // mb-3
          Row(
            children: [
              Expanded(
                child: _callButton(pickup.customerMobile),
              ),
              if (startable) ...[
                const SizedBox(width: 12), // gap-3
                Expanded(
                  child: GradientButton(
                    label: starting ? 'Starting...' : 'Start Pickup',
                    height: 42, // py-2.5
                    radius: Brand.rXl,
                    fontSize: 14,
                    busy: starting,
                    onPressed: starting ? null : () => _start(pickup),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _callButton(String mobile) {
    return SizedBox(
      height: 42,
      child: OutlinedButton(
        onPressed:
            mobile.isEmpty ? null : () => launchUrl(Uri.parse('tel:$mobile')),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: Brand.purple, width: 2),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(Brand.rXl),
          ),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('\u{1F4DE}', style: TextStyle(fontSize: 14)),
            SizedBox(width: 8),
            Text(
              'Call',
              style: TextStyle(
                fontFamily: Brand.heading,
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Brand.purple,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// "Today" for today's slot, otherwise `d-m-yyyy`, as the web app prints it.
  static String _displayDate(String value) {
    final date = DateTime.tryParse(value);
    if (date == null) return '';
    final now = DateTime.now();
    final day = DateTime(date.year, date.month, date.day);
    final today = DateTime(now.year, now.month, now.day);
    if (day == today) return 'Today';
    return '${day.day}-${day.month}-${day.year}';
  }

  /// A pickup can be started once its day has arrived; a slot dated for
  /// tomorrow cannot be started today.
  static bool _isStartable(String value) {
    final date = DateTime.tryParse(value);
    if (date == null) return true;
    final now = DateTime.now();
    final day = DateTime(date.year, date.month, date.day);
    final today = DateTime(now.year, now.month, now.day);
    return !day.isAfter(today);
  }
}
