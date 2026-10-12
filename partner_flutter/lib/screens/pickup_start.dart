import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/order.dart';
import '../services/api.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/common.dart';
import '../widgets/live_navigation_map.dart';

/// `app/pickups/start/page.tsx`.
///
/// The captain is on their way: live navigation to the door, the customer's
/// details and the order to count against, then "Reached Location" which moves
/// the order on, or "Stop Pickup" which hands it back to the pool.
class PickupStartScreen extends StatefulWidget {
  const PickupStartScreen({super.key, required this.orderId});

  /// Mongo `_id`, passed as a query string in the web app.
  final String orderId;

  @override
  State<PickupStartScreen> createState() => _PickupStartScreenState();
}

class _PickupStartScreenState extends State<PickupStartScreen> {
  PartnerOrder? _order;
  bool _loading = true;
  bool _working = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final result = await Api.order(widget.orderId);
    if (!mounted) return;
    setState(() {
      if (result.ok) _order = PartnerOrder(result.map);
      _loading = false;
    });
  }

  Future<void> _reached() async {
    final order = _order;
    if (order == null || _working) return;
    setState(() => _working = true);

    final result = await Api.patchOrder(order.id, {
      'status': 'reached_location',
      'reachedLocationAt': DateTime.now().toIso8601String(),
      'partnerId': Store.partnerId,
    });

    if (!mounted) return;
    setState(() => _working = false);

    if (!result.ok) {
      showToast(context, 'Failed to update order', kind: ToastKind.error);
      return;
    }
    Navigator.of(context)
        .pushReplacementNamed('/pickups/confirm', arguments: {'id': order.id});
  }

  Future<void> _stop() async {
    final order = _order;
    if (order == null || _working) return;

    final sure = await confirmModal(
      context,
      title: 'Stop Pickup',
      message: 'Are you sure you want to stop this pickup? The order will be '
          'unassigned and available for other partners.',
      confirmText: 'Stop Pickup',
    );
    if (!sure || !mounted) return;

    setState(() => _working = true);
    final result = await Api.patchOrder(order.id, {'partnerId': null});
    if (!mounted) return;
    setState(() => _working = false);

    if (!result.ok) {
      showToast(context, 'Failed to stop pickup', kind: ToastKind.error);
      return;
    }
    showToast(context, 'Pickup stopped. Order unassigned.',
        kind: ToastKind.success);
    await Future<void>.delayed(const Duration(seconds: 1));
    if (!mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil('/pickups', (r) => false);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: Brand.gray50,
        body: Center(
            child: Padding(
          padding: EdgeInsets.all(32),
          child: Text('Loading...'),
        )),
      );
    }

    final order = _order;
    if (order == null) {
      return const Scaffold(
        backgroundColor: Brand.gray50,
        body: Center(
            child: Padding(
          padding: EdgeInsets.all(32),
          child: Text('Order not found'),
        )),
      );
    }

    if (order.status == 'cancelled') return _cancelled(order);

    return Scaffold(
      backgroundColor: Brand.gray50,
      appBar: AppHeader(
        title: 'Pickup in Progress',
        onBack: () => Navigator.of(context)
            .pushNamedAndRemoveUntil('/pickups', (r) => false),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
          children: [
            LiveNavigationMap(
              destination: order.pickupAddress,
              raw: order.raw['pickupAddress'] is Map
                  ? Map<String, dynamic>.from(order.raw['pickupAddress'] as Map)
                  : null,
              label: 'Pickup location',
              customerName: order.customerName,
            ),
            const SizedBox(height: 16),
            _customerCard(order),
            const SizedBox(height: 16),
            _orderCard(order),
            const SizedBox(height: 20), // mt-5
            GradientButton(
              label: 'Reached Location',
              height: 48,
              radius: Brand.rXl,
              busy: _working,
              onPressed: _working ? null : _reached,
            ),
            const SizedBox(height: 12), // mt-3
            SizedBox(
              height: 48,
              child: OutlinedButton(
                onPressed: _working ? null : _stop,
                style: OutlinedButton.styleFrom(
                  backgroundColor: Colors.white,
                  side: const BorderSide(color: Brand.red600, width: 2),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(Brand.rXl),
                  ),
                ),
                child: const Text(
                  'Stop Pickup',
                  style: TextStyle(
                    fontFamily: Brand.heading,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Brand.red600,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _card({required Widget child, Color? border, double width = 1}) =>
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Brand.surface,
          borderRadius: BorderRadius.circular(Brand.rXl),
          border: Border.all(color: border ?? Brand.gray200, width: width),
          boxShadow: const [
            BoxShadow(
                color: Color(0x14000000), blurRadius: 6, offset: Offset(0, 1)),
          ],
        ),
        child: child,
      );

  Widget _customerCard(PartnerOrder order) {
    final mobile = order.customerMobile;
    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            order.customerName,
            style: const TextStyle(
              fontFamily: Brand.heading,
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Colors.black,
            ),
          ),
          const SizedBox(height: 4),
          Text(mobile,
              style: const TextStyle(fontSize: 12, color: Colors.black)),
          const SizedBox(height: 4),
          Text(
            '\u{1F4CD} ${order.pickupAddress.shortLine}',
            style: const TextStyle(fontSize: 12, color: Colors.black),
          ),
          const SizedBox(height: 12),
          // Only when there is a number to reach. An order without one used to
          // take the whole screen down with it.
          if (mobile.isEmpty)
            const Text('No contact number on this order.',
                style: TextStyle(fontSize: 12, color: Brand.gray500))
          else
            Row(
              children: [
                _contactButton(
                  glyph: '\u{1F4DE}',
                  label: 'Call Customer',
                  onTap: () => launchUrl(Uri.parse('tel:$mobile')),
                ),
                const SizedBox(width: 12),
                _contactButton(
                  glyph: '\u{1F4AC}',
                  label: 'Message',
                  onTap: () => launchUrl(
                    Uri.parse(
                        'https://wa.me/${mobile.replaceAll(RegExp(r'[^0-9]'), '')}'),
                    mode: LaunchMode.externalApplication,
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _contactButton({
    required String glyph,
    required String label,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(Brand.rLg),
      child: InkWell(
        borderRadius: BorderRadius.circular(Brand.rLg),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(Brand.rLg),
            border: Border.all(color: Brand.inputBorder, width: 2),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(glyph, style: const TextStyle(fontSize: 13)),
              const SizedBox(width: 8),
              Text(
                label,
                style: const TextStyle(
                  fontFamily: Brand.heading,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Brand.purple,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _orderCard(PartnerOrder order) {
    final items = order.items;
    return _card(
      border: Brand.purple,
      width: 2,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Order Details',
            style: TextStyle(
              fontFamily: Brand.heading,
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Colors.black,
            ),
          ),
          const SizedBox(height: 8),
          Text('Order ID: ${order.orderId}',
              style: const TextStyle(fontSize: 14, color: Colors.black)),
          const SizedBox(height: 12),
          Text(
            items.isEmpty ? 'Items:' : 'Items (${order.itemCount} pieces):',
            style: const TextStyle(
                fontSize: 14, fontWeight: FontWeight.w500, color: Colors.black),
          ),
          const SizedBox(height: 6),
          if (items.isEmpty)
            const Padding(
              padding: EdgeInsets.only(left: 8),
              child: Text('No items found',
                  style: TextStyle(fontSize: 12, color: Brand.gray600)),
            )
          else
            // Laid out like a cart receipt so the captain can tick garments off
            // against it while counting.
            Container(
              decoration: BoxDecoration(
                border: Border.all(color: Brand.gray200),
                borderRadius: BorderRadius.circular(Brand.rLg),
              ),
              child: Column(
                children: [
                  for (var i = 0; i < items.length; i++) ...[
                    if (i > 0) const Divider(height: 1, color: Brand.gray100),
                    Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Text.rich(
                              TextSpan(
                                style: const TextStyle(
                                    fontSize: 14, color: Colors.black),
                                children: [
                                  TextSpan(
                                    text: '${items[i].quantity}x ',
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w600),
                                  ),
                                  TextSpan(text: items[i].name),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Text(
                            rupees(items[i].price * items[i].quantity),
                            style: const TextStyle(
                                fontSize: 14, color: Brand.gray600),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          const SizedBox(height: 8),
          Text('Total Price: ${rupees(order.totalAmount)}',
              style: const TextStyle(fontSize: 14, color: Colors.black)),
          Text(
            'Special Instructions: '
            '${order.specialInstructions.isEmpty ? 'None' : order.specialInstructions}',
            style: const TextStyle(fontSize: 14, color: Colors.black),
          ),
          if (order.specialInstructions.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFFEFCE8),
                border: Border.all(color: const Color(0xFFFEF08A)),
                borderRadius: BorderRadius.circular(Brand.rLg),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Customer Notes:',
                      style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF854D0E))),
                  const SizedBox(height: 4),
                  Text(order.specialInstructions,
                      style: const TextStyle(
                          fontSize: 12, color: Color(0xFFA16207))),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _cancelled(PartnerOrder order) {
    return Scaffold(
      backgroundColor: Brand.gray50,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 448),
              child: Container(
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: Brand.surface,
                  borderRadius: BorderRadius.circular(Brand.r2xl),
                  boxShadow: const [
                    BoxShadow(color: Color(0x1A000000), blurRadius: 15),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      height: 80,
                      width: 80,
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          colors: [Brand.red500, Brand.red600],
                        ),
                        shape: BoxShape.circle,
                      ),
                      child: const Center(
                        child: Text('❌', style: TextStyle(fontSize: 36)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Order Cancelled',
                      style: TextStyle(
                        fontFamily: Brand.heading,
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        color: Brand.gray900,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'This order has been cancelled by the customer.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Brand.gray500),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Order ID: ${order.orderId}',
                      style:
                          const TextStyle(fontSize: 14, color: Brand.gray500),
                    ),
                    const SizedBox(height: 24),
                    GradientButton(
                      label: 'Back to Pickups',
                      height: 48,
                      radius: Brand.rXl,
                      onPressed: () => Navigator.of(context)
                          .pushNamedAndRemoveUntil('/pickups', (r) => false),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
