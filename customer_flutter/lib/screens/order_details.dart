import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/order.dart';
import '../services/api.dart';
import '../services/invoice.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/common.dart';
import '../widgets/pickup_checklist.dart';
import '../widgets/lucide.dart';

class _Step {
  const _Step({
    required this.icon,
    required this.label,
    required this.time,
    required this.done,
    required this.active,
    this.failed = false,
  });

  final IconData icon;
  final String label;
  final String time;
  final bool done;
  final bool active;
  final bool failed;
}

class OrderDetailsScreen extends StatefulWidget {
  const OrderDetailsScreen({super.key, required this.orderId});

  final String orderId;

  @override
  State<OrderDetailsScreen> createState() => _OrderDetailsScreenState();
}

class _OrderDetailsScreenState extends State<OrderDetailsScreen> {
  static final _stamp = DateFormat('dd MMM hh:mm a');

  CustomerOrder? _order;
  bool _loading = true;
  bool _reporting = false;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    if (widget.orderId.isEmpty) {
      _loading = false;
      return;
    }
    _fetch();
    // The admin and the captain both move this order along, so it is polled
    // while the screen is open.
    _poll = Timer.periodic(const Duration(seconds: 5), (_) => _fetch());
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  Future<void> _fetch() async {
    // Fetched by its own id. The web screen pulled every order in the database
    // and searched the list, which shipped other customers' names, phone
    // numbers and addresses to the phone every five seconds.
    final result = await Api.order(widget.orderId);
    if (!mounted) return;
    setState(() {
      if (result.ok && result.data is Map) {
        _order = CustomerOrder.fromJson(result.map);
      }
      _loading = false;
    });
  }

  String _at(DateTime? date, [String fallback = 'Pending']) =>
      date == null ? fallback : _stamp.format(date);

  List<_Step> _timeline(CustomerOrder order) {
    const stepOf = {
      'pending': 0,
      'reached_location': 1,
      'picked_up': 2,
      'delivered_to_hub': 3,
      'processing': 3,
      'ironing': 3,
      'suspended': 3,
      'process_completed': 4,
      'ready': 4,
      'out_for_delivery': 5,
      'delivered': 6,
      'delivery_failed': 6,
    };
    final current = stepOf[order.status] ?? 0;

    final undelivered =
        order.status == 'delivery_failed' && !order.redeliveryScheduled;
    final finalLabel = undelivered
        ? 'Undelivered'
        : (order.redeliveryScheduled && order.status == 'delivered')
            ? 'Redelivered Successfully'
            : 'Delivered';
    final finalTime = undelivered
        ? _at(order.deliveryFailedAt, 'Failed')
        : _at(order.deliveredAt);

    return [
      _Step(
        icon: Icons.schedule,
        label: 'Order Placed',
        time: _at(order.createdAt, ''),
        done: true,
        active: current == 0,
      ),
      _Step(
        icon: Icons.inventory_2_outlined,
        label: 'Reached Location',
        time: _at(order.reachedLocationAt),
        done: current >= 1,
        active: current == 1,
      ),
      _Step(
        icon: Icons.inventory_2_outlined,
        label: 'Picked Up',
        time: _at(order.pickedUpAt),
        done: current >= 2,
        active: current == 2,
      ),
      _Step(
        icon: Icons.local_shipping_outlined,
        label: 'Delivered to Hub',
        time: _at(order.deliveredToHubAt),
        done: current >= 3,
        active: current == 3,
      ),
      _Step(
        icon: Icons.check_circle_outline,
        label: 'Process Completed',
        time: _at(order.processCompletedAt),
        done: current >= 4,
        active: current == 4,
      ),
      _Step(
        icon: Icons.local_shipping_outlined,
        label: order.redeliveryScheduled
            ? 'Out for Redelivery'
            : 'Out for Delivery',
        time: order.redeliveryScheduled
            ? _at(order.outForRedeliveryAt)
            : _at(order.outForDeliveryAt),
        done: current >= 5,
        active: current == 5,
      ),
      _Step(
        icon: undelivered ? Icons.close : Icons.check_circle_outline,
        label: finalLabel,
        time: finalTime,
        done: current >= 6,
        active: current == 6,
        failed: undelivered,
      ),
    ];
  }

  Future<void> _callPartner(CustomerOrder order) async {
    final partnerId = order.partnerId;
    if (partnerId == null) {
      showToast(context, 'No partner assigned yet', error: true);
      return;
    }
    final result = await Api.partner(partnerId);
    if (!mounted) return;
    final mobile = result.ok ? result.map['mobile']?.toString() : null;
    if (mobile == null || mobile.isEmpty) {
      showToast(context, 'Partner contact not available', error: true);
      return;
    }
    try {
      await launchUrl(Uri.parse('tel:$mobile'));
    } catch (_) {
      if (mounted) {
        showToast(context, 'Could not open the dialler', error: true);
      }
    }
  }

  Future<void> _reportIssue(CustomerOrder order) async {
    final controller = TextEditingController();
    final text = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          'Report Issue',
          style: TextStyle(fontFamily: 'Montserrat', fontWeight: FontWeight.w700),
        ),
        content: TextField(
          controller: controller,
          maxLines: 5,
          autofocus: true,
          decoration: const InputDecoration(hintText: 'Describe the issue...'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Cancel', style: TextStyle(color: Brand.mutedForeground)),
          ),
          TextButton(
            onPressed: () =>
                Navigator.of(dialogContext).pop(controller.text.trim()),
            child: const Text('Submit',
                style: TextStyle(color: Brand.purple, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
    controller.dispose();

    if (text == null || !mounted) return;
    if (text.isEmpty) {
      showToast(context, 'Please describe the issue', error: true);
      return;
    }

    setState(() => _reporting = true);
    final result = await Api.patchOrder(order.id, {
      'issue': text,
      'issueReportedAt': DateTime.now().toIso8601String(),
    });
    if (!mounted) return;
    setState(() => _reporting = false);

    if (result.ok) {
      showToast(context, 'Issue reported successfully!');
      await _fetch();
    } else {
      showToast(context, 'Failed to report issue: ${result.error ?? 'Unknown error'}',
          error: true);
    }
  }

  Future<void> _downloadInvoice(CustomerOrder order) async {
    showToast(context, 'Preparing invoice...');
    final error = await Invoice.shareFor(
      order,
      customerName: Store.userName.isEmpty ? null : Store.userName,
      customerMobile: Store.getString(Store.kCustomerMobile),
    );
    if (!mounted || error == null) return;
    showToast(context, error, error: true);
  }

  @override
  Widget build(BuildContext context) {
    final order = _order;
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: const AppHeader(title: 'Track Order', gradient: true),
      body: _loading
          ? const Center(
              child: Text('Loading order details...',
                  style: TextStyle(color: Brand.mutedForeground)),
            )
          : order == null
              ? const Center(
                  child: Text('Order not found',
                      style: TextStyle(color: Brand.mutedForeground)),
                )
              : ListView(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                  children: [
                    _header(order),
                    const SizedBox(height: 20),
                    for (final step in _timeline(order))
                      Padding(
                        padding: const EdgeInsets.only(bottom: 14),
                        child: _timelineRow(step),
                      ),
                    if (order.previousDuePaid > 0) ...[
                      const SizedBox(height: 6),
                      _notice(
                        emoji: '\u{1F4B0}',
                        title: 'Previous Due Paid',
                        lines: [
                          '${rupees(order.previousDuePaid)} included in total',
                          'Cleared from previous pending amount',
                        ],
                        background: const Color(0xFFDBEAFE),
                        border: const Color(0xFF3B82F6),
                        titleColor: const Color(0xFF1E40AF),
                        textColor: const Color(0xFF1D4ED8),
                      ),
                    ],
                    if (order.deliveryFailureFee > 0) ...[
                      const SizedBox(height: 12),
                      _notice(
                        emoji: '\u{1F4B3}',
                        title: 'Charges Applied',
                        lines: [
                          '${rupees(order.deliveryFailureFee)} deducted from your wallet balance',
                          'Reason: ${order.deliveryFailureReason ?? 'Delivery failure charge'}',
                        ],
                        background: const Color(0xFFFEF3C7),
                        border: const Color(0xFFF59E0B),
                        titleColor: const Color(0xFF92400E),
                        textColor: const Color(0xFFB45309),
                      ),
                    ],
                    if (order.status == 'delivery_failed') ...[
                      const SizedBox(height: 12),
                      _notice(
                        emoji: '⚠️',
                        title: order.redeliveryScheduled
                            ? 'Redelivery Failed'
                            : 'Delivery Failed',
                        lines: [
                          'Reason: ${order.deliveryFailureReason ?? 'Not specified'}',
                          if (order.redeliveryScheduled)
                            'This order failed delivery multiple times.',
                        ],
                        background: const Color(0xFFFEE2E2),
                        border: const Color(0xFFEF4444),
                        titleColor: const Color(0xFFB91C1C),
                        textColor: const Color(0xFFDC2626),
                      ),
                    ],
                    if (order.cancellationFee > 0) ...[
                      const SizedBox(height: 12),
                      _notice(
                        emoji: '\u{1F4B3}',
                        title: 'Charges Applied',
                        lines: [
                          '${rupees(order.cancellationFee)} deducted from your wallet balance',
                          'Reason: ${order.cancellationReason ?? 'Order cancellation charge'}',
                        ],
                        background: const Color(0xFFFEF3C7),
                        border: const Color(0xFFF59E0B),
                        titleColor: const Color(0xFF92400E),
                        textColor: const Color(0xFFB45309),
                      ),
                    ],
                    if (order.status == 'cancelled') ...[
                      const SizedBox(height: 12),
                      _notice(
                        emoji: '❌',
                        title: 'Order Cancelled',
                        lines: [
                          if ((order.cancellationReason ?? '').isNotEmpty)
                            'Reason: ${order.cancellationReason}',
                        ],
                        background: const Color(0xFFFEE2E2),
                        border: const Color(0xFFEF4444),
                        titleColor: const Color(0xFFB91C1C),
                        textColor: const Color(0xFFDC2626),
                      ),
                    ],
                    if (order.status == 'suspended') ...[
                      const SizedBox(height: 12),
                      _notice(
                        emoji: '\u{1F6AB}',
                        title: 'Order Suspended',
                        lines: [
                          'Reason: ${order.suspensionReason ?? 'Multiple delivery failures'}',
                          'Please contact admin for further assistance.',
                        ],
                        background: const Color(0xFFFEF3C7),
                        border: const Color(0xFFF59E0B),
                        titleColor: const Color(0xFFB45309),
                        textColor: const Color(0xFFB45309),
                      ),
                    ],
                    const SizedBox(height: 14),
                    _addressCard(order),
                    // Pickup guidance is only useful until the captain has
                    // actually collected the clothes.
                    if (['pending', 'reached_location'].contains(order.status)) ...[
                      const SizedBox(height: 14),
                      const PickupChecklist(),
                    ],
                    const SizedBox(height: 14),
                    _paymentSummary(order),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: SizedBox(
                            height: 48,
                            child: OutlinedButton.icon(
                              onPressed: order.hasPartner
                                  ? () => _callPartner(order)
                                  : null,
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(
                                    color: Brand.purple, width: 2),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                              ),
                              icon: const Icon(Icons.phone,
                                  size: 18, color: Brand.purple),
                              label: const Text(
                                'Contact Partner',
                                style: TextStyle(
                                  color: Brand.purple,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: SizedBox(
                            height: 48,
                            child: ElevatedButton(
                              onPressed:
                                  _reporting ? null : () => _reportIssue(order),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFDC2626),
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                              ),
                              child: const Text(
                                '⚠ Report Issue',
                                style: TextStyle(
                                    fontSize: 13, fontWeight: FontWeight.w600),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    GradientButton(
                      label: 'Download Invoice',
                      icon: Icons.download,
                      height: 48,
                      onPressed: () => _downloadInvoice(order),
                    ),
                  ],
                ),
    );
  }

  Widget _header(CustomerOrder order) {
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
            child: Lucide.shirt(size: 19, color: Colors.white),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Order #${order.orderId.isEmpty ? 'N/A' : order.orderId}',
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, fontSize: 14.5),
                ),
                const SizedBox(height: 4),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: order.expressDelivery
                        ? const Color(0xFFFEF3C7)
                        : const Color(0xFFF3F4F6),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(
                      color: order.expressDelivery
                          ? const Color(0xFFFDE68A)
                          : const Color(0xFFE5E7EB),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (order.expressDelivery) ...[
                        const Icon(Icons.schedule,
                            size: 11, color: Color(0xFFB45309)),
                        const SizedBox(width: 3),
                      ],
                      Text(
                        order.expressDelivery
                            ? 'Express Delivery'
                            : 'Standard Delivery',
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w700,
                          color: order.expressDelivery
                              ? const Color(0xFFB45309)
                              : const Color(0xFF4B5563),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  order.itemsText,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12.5, color: Brand.mutedForeground),
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
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              gradient: Brand.gradient,
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
    );
  }

  Widget _timelineRow(_Step step) {
    return Row(
      children: [
        Container(
          height: 38,
          width: 38,
          decoration: BoxDecoration(
            gradient: step.done
                ? (step.failed
                    ? const LinearGradient(
                        colors: [Color(0xFFEF4444), Color(0xFFDC2626)])
                    : Brand.gradient)
                : null,
            color: step.done ? null : const Color(0xFFF3F4F6),
            shape: BoxShape.circle,
          ),
          child: Icon(
            step.icon,
            size: 19,
            color: step.done ? Colors.white : Brand.mutedForeground,
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              step.active
                  ? GradientText(
                      step.label,
                      style: const TextStyle(
                          fontWeight: FontWeight.w600, fontSize: 14.5),
                    )
                  : Text(
                      step.label,
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14.5,
                        color: step.done ? Colors.black : Brand.mutedForeground,
                      ),
                    ),
              if (step.time.isNotEmpty)
                Text(step.time,
                    style: const TextStyle(fontSize: 12.5, color: Brand.mutedForeground)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _notice({
    required String emoji,
    required String title,
    required List<String> lines,
    required Color background,
    required Color border,
    required Color titleColor,
    required Color textColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border, width: 2),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(emoji, style: const TextStyle(fontSize: 20)),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w700,
                    color: titleColor,
                  ),
                ),
                for (final line in lines)
                  Padding(
                    padding: const EdgeInsets.only(top: 3),
                    child: Text(
                      line,
                      style: TextStyle(
                          fontSize: 12.5, color: textColor, height: 1.45),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _addressCard(CustomerOrder order) {
    final address = order.pickupAddress;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFF0EBF8), Color(0xFFE0F7FA)],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE5E7EB), width: 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Pickup Address: '
            '${address == null ? 'Not specified' : [address.street, address.city].where((p) => p.isNotEmpty).join(', ')}',
            style: const TextStyle(
                fontSize: 13, fontWeight: FontWeight.w500, height: 1.5),
          ),
          const SizedBox(height: 4),
          Text(
            'Pickup Slot: ${order.pickupSlotLabel ?? 'Not scheduled'}',
            style: const TextStyle(
                fontSize: 13, fontWeight: FontWeight.w500, height: 1.5),
          ),
        ],
      ),
    );
  }

  Widget _paymentSummary(CustomerOrder order) {
    final b = order.breakdown;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Brand.border, width: 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Payment Summary',
            style: TextStyle(
              fontFamily: 'Montserrat',
              fontSize: 15,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          _summaryRow('Items Subtotal', rupees(b.subtotal)),
          if (b.express > 0)
            _summaryRow('Express Delivery Fee', '+${rupees(b.express)}'),
          if (b.due > 0) _summaryRow('Previous Due', '+${rupees(b.due)}'),
          if (b.discount > 0)
            _summaryRow('Discount', '-${rupees(b.discount)}',
                color: Brand.green600),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 6),
            child: Divider(height: 1),
          ),
          _summaryRow('Order Total', rupees(b.total), bold: true),
          if (b.wallet > 0)
            _summaryRow('Paid from Wallet', rupees(b.wallet)),
          if ((b.paidOnline ?? 0) > 0)
            _summaryRow('Paid Online', rupees(b.paidOnline!)),
        ],
      ),
    );
  }

  Widget _summaryRow(String label, String value,
      {Color? color, bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: bold ? 14.5 : 13,
                color: color ?? const Color(0xFF374151),
                fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
              ),
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: bold ? 14.5 : 13,
              color: color ?? (bold ? Colors.black : const Color(0xFF374151)),
              fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
            ),
          ),
        ],
      ),
    );
  }
}
