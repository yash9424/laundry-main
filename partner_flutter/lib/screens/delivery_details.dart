import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/order.dart';
import '../services/api.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../utils/order_breakdown.dart';
import '../widgets/address_map.dart';
import '../widgets/common.dart';
import '../widgets/live_navigation_map.dart';

/// `app/delivery/details/page.tsx` -- the last screen of an order's life.
///
/// Start the delivery, then either hand it over or record why it could not be
/// handed over. A failure here is what starts the return-and-redelivery loop:
/// the order comes back in the hub drop list with a return request for the
/// admin to approve.
class DeliveryDetailsScreen extends StatefulWidget {
  const DeliveryDetailsScreen({super.key, required this.orderId});

  final String orderId;

  @override
  State<DeliveryDetailsScreen> createState() => _DeliveryDetailsScreenState();
}

class _DeliveryDetailsScreenState extends State<DeliveryDetailsScreen> {
  PartnerOrder? _order;
  bool _loading = true;
  bool _working = false;
  DateTime _now = DateTime.now();
  Timer? _tick;

  @override
  void initState() {
    super.initState();
    _load();
    _tick = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) setState(() => _now = DateTime.now());
    });
  }

  @override
  void dispose() {
    _tick?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    final result = await Api.order(widget.orderId);
    if (!mounted) return;
    setState(() {
      if (result.ok) _order = PartnerOrder(result.map);
      _loading = false;
    });
  }

  Future<void> _startDelivery() async {
    final order = _order;
    if (order == null || _working) return;
    setState(() => _working = true);

    final result = await Api.patchOrder(order.id, {
      'status': 'out_for_delivery',
      'partnerId': Store.partnerId,
      if (order.redeliveryScheduled)
        'outForRedeliveryAt': DateTime.now().toIso8601String()
      else
        'outForDeliveryAt': DateTime.now().toIso8601String(),
    });

    if (!mounted) return;
    setState(() => _working = false);
    if (!result.ok) {
      showToast(context, 'Failed to start delivery', kind: ToastKind.error);
      return;
    }
    await _load();
  }

  Future<void> _cancelDelivery() async {
    final order = _order;
    if (order == null || _working) return;

    final sure = await confirmModal(
      context,
      title: 'Cancel Delivery',
      message: 'Are you sure you want to cancel this delivery? The order will '
          'be available for other partners.',
      confirmText: 'Cancel Delivery',
      cancelText: 'Go Back',
    );
    if (!sure || !mounted) return;

    setState(() => _working = true);
    final result = await Api.patchOrder(order.id, {
      'status': 'process_completed',
      'partnerId': null,
      'outForDeliveryAt': null,
    });
    if (!mounted) return;
    setState(() => _working = false);

    if (!result.ok) {
      showToast(context, 'Failed to cancel delivery', kind: ToastKind.error);
      return;
    }
    showToast(context, 'Delivery cancelled successfully',
        kind: ToastKind.success);
    await Future<void>.delayed(const Duration(milliseconds: 1500));
    if (!mounted) return;
    Navigator.of(context)
        .pushNamedAndRemoveUntil('/delivery/pick', (r) => false);
  }

  Future<void> _delivered() async {
    final order = _order;
    if (order == null || _working) return;
    setState(() => _working = true);

    final result = await Api.patchOrder(order.id, {
      'status': 'delivered',
      'deliveredAt': DateTime.now().toIso8601String(),
    });
    if (!mounted) return;
    setState(() => _working = false);

    if (!result.ok) {
      showToast(context, 'Failed to mark as delivered', kind: ToastKind.error);
      return;
    }
    showToast(
      context,
      order.redeliveryScheduled
          ? 'Order redelivered successfully!'
          : 'Order delivered successfully!',
      kind: ToastKind.success,
    );
    await Future<void>.delayed(const Duration(milliseconds: 1500));
    if (!mounted) return;
    Navigator.of(context)
        .pushNamedAndRemoveUntil('/delivery/pick', (r) => false);
  }

  /// The failure reasons are matched by their text on the server, which turns
  /// them into the fee from OrderCharges -- so the wording has to stay
  /// exactly as it is.
  Future<void> _notDelivered() async {
    final order = _order;
    if (order == null) return;

    final reasons = await showDialog<List<String>>(
      context: context,
      builder: (context) => const _FailureDialog(),
    );
    if (reasons == null || reasons.isEmpty || !mounted) return;

    setState(() => _working = true);
    final result = await Api.patchOrder(order.id, {
      'status': 'delivery_failed',
      'deliveryFailureReason': reasons.join(', '),
      'deliveryFailedAt': DateTime.now().toIso8601String(),
    });
    if (!mounted) return;
    setState(() => _working = false);

    if (!result.ok) {
      showToast(context, 'Failed to update order', kind: ToastKind.error);
      return;
    }
    showToast(context, 'Order marked as delivery failed',
        kind: ToastKind.success);
    await Future<void>.delayed(const Duration(seconds: 2));
    if (!mounted) return;
    Navigator.of(context)
        .pushNamedAndRemoveUntil('/delivery/pick', (r) => false);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: Brand.gray50,
        body: Center(
          child:
              Padding(padding: EdgeInsets.all(32), child: Text('Loading...')),
        ),
      );
    }
    final order = _order;
    if (order == null) {
      return const Scaffold(
        backgroundColor: Brand.gray50,
        body: Center(
          child: Padding(
              padding: EdgeInsets.all(32), child: Text('Order not found')),
        ),
      );
    }

    final addressRaw = order.raw['deliveryAddress'] is Map
        ? Map<String, dynamic>.from(order.raw['deliveryAddress'] as Map)
        : (order.raw['pickupAddress'] is Map
            ? Map<String, dynamic>.from(order.raw['pickupAddress'] as Map)
            : null);

    return Scaffold(
      backgroundColor: Brand.gray50,
      appBar: AppHeader(
        title: 'Delivery Details',
        onBack: () => Navigator.of(context)
            .pushNamedAndRemoveUntil('/delivery/pick', (r) => false),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
          children: [
            SizedBox(
              height: 192,
              child: order.deliveryAddress.isEmpty
                  ? const NoLocationsMap(message: 'No delivery address')
                  : AddressMap(
                      address: order.deliveryAddress,
                      raw: addressRaw,
                      height: 192,
                      borderRadius: Brand.rXl,
                    ),
            ),
            const SizedBox(height: 12),
            LiveNavigationMap(
              destination: order.deliveryAddress,
              raw: addressRaw,
              label: 'Delivery location',
              customerName: order.customerName,
            ),
            const SizedBox(height: 16),
            _summaryCard(order),
            const SizedBox(height: 16),
            _itemsCard(order),
            const SizedBox(height: 16),
            _paymentCard(order),
            const SizedBox(height: 20),
            _cta(order),
          ],
        ),
      ),
    );
  }

  Widget _shell({required Widget child}) => Container(
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
        child: child,
      );

  Widget _summaryCard(PartnerOrder order) {
    final expected =
        DateTime.tryParse((order.raw['expectedDeliveryAt'] ?? '').toString());
    final showExpress = order.expressDelivery &&
        order.status != 'delivered' &&
        order.status != 'cancelled';

    return _shell(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  'Order #${order.orderId}',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Colors.black,
                  ),
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  gradient: Brand.gradient,
                  borderRadius: BorderRadius.circular(Brand.rLg),
                ),
                child: Text(
                  order.status == 'process_completed'
                      ? 'Ready for Delivery'
                      : _titleCase(order.status),
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
          if (showExpress) ...[
            const SizedBox(height: 8),
            Text(
              'Express Delivery · ⏳ '
              '${expected == null ? 'Timer starts at pickup' : _countdownText(expected)}',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: expected != null && expected.isBefore(_now)
                    ? Brand.red600
                    : const Color(0xFFD97706),
              ),
            ),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Text(order.customerName,
                    style: const TextStyle(fontSize: 14, color: Colors.black)),
              ),
              Text(order.customerMobile,
                  style: const TextStyle(fontSize: 14, color: Colors.black)),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: order.customerMobile.isEmpty
                    ? null
                    : () => launchUrl(Uri.parse('tel:${order.customerMobile}')),
                child: Container(
                  height: 32,
                  width: 32,
                  decoration: BoxDecoration(
                    gradient: Brand.gradient,
                    borderRadius: BorderRadius.circular(Brand.rLg),
                  ),
                  child: const Center(
                    child: Text('\u{1F4DE}', style: TextStyle(fontSize: 14)),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '\u{1F4CD} ${order.deliveryAddress.shortLine}',
            style: const TextStyle(fontSize: 14, color: Colors.black),
          ),
        ],
      ),
    );
  }

  Widget _itemsCard(PartnerOrder order) {
    return _shell(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Order Items',
            style: TextStyle(
              fontFamily: Brand.heading,
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Colors.black,
            ),
          ),
          const SizedBox(height: 8),
          for (final item in order.items)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text('${item.quantity} ${item.name}',
                        style:
                            const TextStyle(fontSize: 14, color: Colors.black)),
                  ),
                  Text(rupees(item.price * item.quantity),
                      style:
                          const TextStyle(fontSize: 14, color: Colors.black)),
                ],
              ),
            ),
          const SizedBox(height: 12),
          Text(
            'Total Price: ${rupees(order.totalAmount)}',
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Brand.purple,
            ),
          ),
        ],
      ),
    );
  }

  Widget _paymentCard(PartnerOrder order) {
    final b = OrderBreakdown.of(order);
    final paid = order.paymentStatus == 'paid';

    return _shell(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Payment',
                style: TextStyle(
                  fontFamily: Brand.heading,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.black,
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color:
                      paid ? const Color(0xFFDCFCE7) : const Color(0xFFFEE2E2),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  paid ? 'Paid' : 'Collect ${rupees(b.total)}',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: paid
                        ? const Color(0xFF15803D)
                        : const Color(0xFFB91C1C),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            order.paymentMethod.isEmpty
                ? 'Cash on Delivery'
                : order.paymentMethod,
            style: const TextStyle(fontSize: 12, color: Brand.gray500),
          ),
          const SizedBox(height: 12),
          _money('Items Subtotal', rupees(b.subtotal)),
          if (b.express > 0)
            _money('Express Delivery Fee', '+${rupees(b.express)}'),
          if (b.due > 0) _money('Previous Due', '+${rupees(b.due)}'),
          if (b.discount > 0)
            _money('Discount', '-${rupees(b.discount)}',
                valueColour: Brand.green600),
          const Divider(height: 17, color: Brand.gray100),
          _money('Order Total', rupees(b.total), bold: true),
          if (b.wallet > 0) _money('Paid from Wallet', rupees(b.wallet)),
          if ((b.paidOnline ?? 0) > 0)
            _money('Paid Online', rupees(b.paidOnline)),
        ],
      ),
    );
  }

  Widget _money(String label, String value,
      {bool bold = false, Color? valueColour}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              fontWeight: bold ? FontWeight.w600 : FontWeight.normal,
              color: bold ? Colors.black : Brand.gray600,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 14,
              fontWeight: bold ? FontWeight.w600 : FontWeight.normal,
              color: valueColour ?? Colors.black,
            ),
          ),
        ],
      ),
    );
  }

  Widget _cta(PartnerOrder order) {
    if (order.status == 'process_completed') {
      return Row(
        children: [
          Expanded(
            child: GradientButton(
              label: order.redeliveryScheduled
                  ? 'Start Redelivery'
                  : 'Start Delivery',
              height: 48,
              radius: Brand.rXl,
              busy: _working,
              onPressed: _working ? null : _startDelivery,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: SizedBox(
              height: 48,
              child: OutlinedButton(
                onPressed: _working ? null : _cancelDelivery,
                style: OutlinedButton.styleFrom(
                  backgroundColor: Colors.white,
                  side: const BorderSide(color: Brand.red600, width: 2),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(Brand.rXl),
                  ),
                ),
                child: const Text(
                  'Cancel Delivery',
                  style: TextStyle(
                    fontFamily: Brand.heading,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Brand.red600,
                  ),
                ),
              ),
            ),
          ),
        ],
      );
    }

    if (order.status == 'out_for_delivery') {
      return Row(
        children: [
          Expanded(
            child: SizedBox(
              height: 48,
              child: ElevatedButton(
                onPressed: _working ? null : _delivered,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Brand.green600,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(Brand.rXl),
                  ),
                ),
                child: const Text(
                  'Order Delivered',
                  style: TextStyle(
                      fontFamily: Brand.heading,
                      fontSize: 16,
                      fontWeight: FontWeight.w600),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: SizedBox(
              height: 48,
              child: ElevatedButton(
                onPressed: _working ? null : _notDelivered,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Brand.red600,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(Brand.rXl),
                  ),
                ),
                child: const Text(
                  'Not Delivered',
                  style: TextStyle(
                      fontFamily: Brand.heading,
                      fontSize: 16,
                      fontWeight: FontWeight.w600),
                ),
              ),
            ),
          ),
        ],
      );
    }

    return Container(
      height: 48,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Brand.gray400,
        borderRadius: BorderRadius.circular(Brand.rXl),
      ),
      child: Text(
        order.status == 'delivered' ? 'Delivered' : 'Completed',
        style: const TextStyle(
          fontFamily: Brand.heading,
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: Colors.white,
        ),
      ),
    );
  }

  String _countdownText(DateTime expected) {
    final diff = expected.difference(_now);
    final abs = diff.abs();
    final hours = abs.inHours;
    final minutes = abs.inMinutes % 60;
    final text = '$hours hour${hours != 1 ? 's' : ''} '
        '$minutes minute${minutes != 1 ? 's' : ''}';
    return diff.isNegative ? 'Overdue by $text' : '$text left';
  }

  static String _titleCase(String status) {
    if (status.isEmpty) return '';
    final spaced = status.replaceAll('_', ' ');
    return '${spaced[0].toUpperCase()}${spaced.substring(1)}';
  }
}

/// The three reasons the server knows how to price. The strings are sent
/// verbatim, so they must not be reworded.
class _FailureDialog extends StatefulWidget {
  const _FailureDialog();

  @override
  State<_FailureDialog> createState() => _FailureDialogState();
}

class _FailureDialogState extends State<_FailureDialog> {
  final _chosen = <String, bool>{
    'Customer Unavailable': false,
    'Incorrect Address': false,
    'Refusal to Accept': false,
  };

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Brand.surface,
      insetPadding: const EdgeInsets.all(16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(Brand.rXl),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Padding(
            padding: EdgeInsets.all(16),
            child: Text(
              'Delivery Failure Reason',
              style: TextStyle(
                fontFamily: Brand.heading,
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: Colors.black,
              ),
            ),
          ),
          const Divider(height: 1, color: Brand.gray200),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                for (final reason in _chosen.keys)
                  InkWell(
                    onTap: () =>
                        setState(() => _chosen[reason] = !_chosen[reason]!),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Row(
                        children: [
                          SizedBox(
                            height: 20,
                            width: 20,
                            child: Checkbox(
                              value: _chosen[reason],
                              activeColor: Brand.purple,
                              onChanged: (value) => setState(
                                  () => _chosen[reason] = value ?? false),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              reason,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                color: Colors.black,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const Divider(height: 1, color: Brand.gray200),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 42,
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Brand.gray300, width: 2),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(Brand.rLg),
                        ),
                      ),
                      child: const Text(
                        'Cancel',
                        style: TextStyle(
                          fontFamily: Brand.heading,
                          fontWeight: FontWeight.w600,
                          color: Brand.gray700,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: GradientButton(
                    label: 'Submit',
                    height: 42,
                    radius: Brand.rLg,
                    fontSize: 14,
                    onPressed: () {
                      final reasons = _chosen.entries
                          .where((e) => e.value)
                          .map((e) => e.key)
                          .toList();
                      if (reasons.isEmpty) {
                        showToast(context, 'Please select at least one reason',
                            kind: ToastKind.warning);
                        return;
                      }
                      Navigator.of(context).pop(reasons);
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
