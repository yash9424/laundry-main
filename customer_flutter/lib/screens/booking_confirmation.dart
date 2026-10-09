import 'package:flutter/material.dart';

import '../models/order_charges.dart';
import '../services/api.dart';
import '../theme/brand.dart';
import '../widgets/common.dart';

/// Shown straight after an order is placed: what was booked, what was paid,
/// and the two things the customer may want next -- track it, or cancel it.
class BookingConfirmationScreen extends StatefulWidget {
  const BookingConfirmationScreen({super.key, required this.args});

  final Map<String, dynamic> args;

  @override
  State<BookingConfirmationScreen> createState() =>
      _BookingConfirmationScreenState();
}

class _BookingConfirmationScreenState extends State<BookingConfirmationScreen> {
  OrderChargesConfig _charges = OrderChargesConfig.defaults();
  bool _cancelling = false;

  String get _orderId => (widget.args['orderId'] ?? '').toString();
  String get _items => (widget.args['items'] ?? '').toString();
  String get _status => (widget.args['status'] ?? 'Pending').toString();

  num _amount(String key) =>
      num.tryParse(widget.args[key]?.toString() ?? '') ?? 0;

  /// Once the clothes are back with the customer there is nothing to cancel,
  /// and going ahead charged them a cancellation fee on a completed order.
  bool get _isFinished =>
      ['delivered', 'cancelled'].contains(_status.toLowerCase());

  @override
  void initState() {
    super.initState();
    _loadCharges();
  }

  Future<void> _loadCharges() async {
    final result = await Api.orderCharges();
    if (!mounted || !result.ok) return;
    setState(() => _charges = OrderChargesConfig.fromJson(result.map));
  }

  void _showPolicy() {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => Dialog(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.8,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 8, 12),
                child: Row(
                  children: [
                    const Expanded(
                      child: Text(
                        'Cancellation Fees Terms',
                        style: TextStyle(
                          fontFamily: 'Montserrat',
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.of(dialogContext).pop(),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Text(
                    _charges.cancellationPolicyText.isNotEmpty
                        ? _charges.cancellationPolicyText
                        : 'Cancellation policy not set. Please contact support.',
                    style: TextStyle(
                      fontSize: 13.5,
                      height: 1.6,
                      color: _charges.cancellationPolicyText.isNotEmpty
                          ? const Color(0xFF1F2937)
                          : Brand.mutedForeground,
                    ),
                  ),
                ),
              ),
              const Divider(height: 1),
              Padding(
                padding: const EdgeInsets.all(14),
                child: GradientButton(
                  label: 'Close',
                  height: 46,
                  radius: 12,
                  onPressed: () => Navigator.of(dialogContext).pop(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _cancelOrder() async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text(
          'Cancel Order',
          style: TextStyle(fontFamily: 'Montserrat', fontWeight: FontWeight.w700),
        ),
        content: const Text(
          'Are you sure you want to cancel this order? '
          'Cancellation charges may apply.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('No, Keep Order',
                style: TextStyle(color: Brand.mutedForeground)),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Yes, Cancel',
                style: TextStyle(color: Brand.destructive)),
          ),
        ],
      ),
    );
    if (yes != true || _cancelling) return;

    setState(() => _cancelling = true);

    // Fetched by its own id. The web screen pulled the whole order list and
    // searched it, which downloaded every customer's orders to find one.
    final lookup = await Api.order(_orderId);
    if (!mounted) return;
    if (!lookup.ok) {
      setState(() => _cancelling = false);
      showToast(context, 'Order not found', error: true);
      return;
    }

    final order = lookup.map;
    final id = (order['_id'] ?? _orderId).toString();

    final patched = await Api.patchOrder(id, {
      'status': 'cancelled',
      'cancelledAt': DateTime.now().toIso8601String(),
      'cancellationReason': 'Cancelled by customer',
    });
    if (!mounted) return;
    setState(() => _cancelling = false);

    if (!patched.ok) {
      showToast(context, 'Failed to cancel order. Please try again.',
          error: true);
      return;
    }

    // The fee is decided by the server, so its figure is the one to report.
    final fee = num.tryParse(patched.raw?['cancellationFee']?.toString() ?? '') ?? 0;
    final total = num.tryParse(order['totalAmount']?.toString() ?? '') ?? 0;
    showToast(
      context,
      fee > 0
          ? 'Order cancelled. Cancellation charge of ${rupees(fee)} '
              '(${_charges.cancellationPercentage}% of ${rupees(total)}) '
              'has been deducted from your wallet.'
          : 'Order cancelled successfully. No cancellation charge applied.',
      error: fee > 0,
    );

    await Future<void>.delayed(const Duration(seconds: 4));
    if (!mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil('/home', (r) => false);
  }

  @override
  Widget build(BuildContext context) {
    final slot = (widget.args['selectedSlot'] ?? '').toString();
    final dayLabel = (widget.args['pickupDayLabel'] ?? '').toString();

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: PageHeader(
        'Order Confirmed',
        onBack: () => Navigator.of(context)
            .pushNamedAndRemoveUntil('/home', (r) => false),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 32, 20, 32),
        children: [
          Center(
            child: Container(
              height: 104,
              width: 104,
              decoration: BoxDecoration(
                gradient: Brand.gradient,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Brand.purple.withValues(alpha: 0.3),
                    blurRadius: 20,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: const Icon(Icons.check_circle_outline,
                  size: 54, color: Colors.white),
            ),
          ),
          const SizedBox(height: 22),
          const Text(
            'Your booking is\nconfirmed!',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: 'Montserrat',
              fontSize: 27,
              fontWeight: FontWeight.w700,
              height: 1.25,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'Order #$_orderId has been placed successfully.',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 14.5, color: Brand.mutedForeground),
          ),
          const SizedBox(height: 2),
          Text(
            // The day the customer actually picked, rather than guessing at
            // today or tomorrow as the old screen did.
            'Pickup scheduled for '
            '${dayLabel.isNotEmpty ? dayLabel : 'your selected day'}'
            '${slot.isEmpty ? '' : ', $slot'}.',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 14.5, color: Brand.mutedForeground),
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Brand.border, width: 2),
            ),
            child: Column(
              children: [
                _row('Items:', _items.isEmpty ? '-' : _items),
                _row('Service:', 'Steam Iron'),
                if (widget.args.containsKey('originalTotal'))
                  _row('Items Subtotal:', rupees(_amount('originalTotal'))),
                if (widget.args['expressDelivery'] == true &&
                    _amount('expressDeliveryFee') > 0)
                  _row('Express Delivery Fee:',
                      '+${rupees(_amount('expressDeliveryFee'))}'),
                if (_amount('previousDue') > 0)
                  _row('Previous Due:', '+${rupees(_amount('previousDue'))}'),
                if (_amount('discount') > 0)
                  _row('Discount:', '-${rupees(_amount('discount'))}',
                      valueColor: Brand.green600),
                _row('Order Total:', rupees(_amount('total')),
                    valueColor: Brand.purple, bold: true),
                if (_amount('walletUsed') > 0)
                  _row('Paid from Wallet:', rupees(_amount('walletUsed'))),
                if (_amount('paidOnline') > 0)
                  _row('Paid Online:', rupees(_amount('paidOnline'))),
                _row('Status:', _status, valueColor: Brand.purple),
                _row('Payment Status:', 'Paid', valueColor: Brand.green600),
              ],
            ),
          ),
          const SizedBox(height: 22),
          GradientButton(
            label: 'Track Order',
            icon: Icons.location_on_outlined,
            height: 52,
            onPressed: () => Navigator.of(context).pushNamed(
              '/order-details',
              arguments: {'orderId': _orderId},
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 52,
            child: OutlinedButton(
              onPressed: () => Navigator.of(context)
                  .pushNamedAndRemoveUntil('/home', (r) => false),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Brand.purple, width: 2),
                shape:
                    RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: const Text(
                'Back to Home',
                style: TextStyle(
                  color: Brand.purple,
                  fontSize: 15.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
          if (!_isFinished) ...[
            const SizedBox(height: 12),
            SizedBox(
              height: 52,
              child: ElevatedButton(
                onPressed: _cancelling ? null : _cancelOrder,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFDC2626),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16)),
                ),
                child: Text(
                  _cancelling ? 'Cancelling...' : 'Cancel Order',
                  style: const TextStyle(
                      fontSize: 15.5, fontWeight: FontWeight.w600),
                ),
              ),
            ),
          ],
          const SizedBox(height: 20),
          Center(
            child: GestureDetector(
              onTap: _showPolicy,
              child: const Text(
                'View Cancellation Policy',
                style: TextStyle(
                  fontSize: 13,
                  color: Color(0xFF2563EB),
                  decoration: TextDecoration.underline,
                  decorationColor: Color(0xFF2563EB),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _row(
    String label,
    String value, {
    Color? valueColor,
    bool bold = false,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(label,
                style: const TextStyle(fontSize: 14.5, color: Brand.mutedForeground)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: TextStyle(
                fontSize: bold ? 16 : 14.5,
                fontWeight: bold ? FontWeight.w700 : FontWeight.w600,
                color: valueColor,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
