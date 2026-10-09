import 'package:flutter/material.dart';

import '../content/legal.dart';
import '../models/catalogue.dart';
import '../models/checkout.dart';
import '../models/customer.dart';
import '../models/order_charges.dart';
import '../services/api.dart';
import '../services/cart.dart';
import '../services/payments.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/address_map.dart';
import '../widgets/common.dart';
import '../widgets/legal_body.dart';
import '../widgets/lucide.dart';

/// The last step: offers, what is owed, and payment.
///
/// The arithmetic here is the arithmetic the server trusts, so it is written
/// out in one place and nowhere else:
///
///   grandTotal          = items + expressFee + previousDue
///   discount            = floor(items * voucher% / 100)
///   amountAfterDiscount = grandTotal - discount
///   walletUsed          = min(walletBalance, amountAfterDiscount)
///   finalAmount         = max(0, amountAfterDiscount - walletUsed)
class ContinueBookingScreen extends StatefulWidget {
  const ContinueBookingScreen({super.key, required this.draft});

  final CheckoutDraft? draft;

  @override
  State<ContinueBookingScreen> createState() => _ContinueBookingScreenState();
}

class _ContinueBookingScreenState extends State<ContinueBookingScreen> {
  final _notes = TextEditingController();

  CustomerProfile? _customer;
  Map<String, dynamic>? _pastOrder;
  OrderChargesConfig _charges = OrderChargesConfig.defaults();
  List<Voucher> _vouchers = [];

  Voucher? _appliedVoucher;
  num _discount = 0;
  String _couponError = '';

  bool _expressDelivery = false;
  bool _policyAcknowledged = false;
  bool _showGarmentNote = true;
  bool _placing = false;

  /// Prices re-read from the catalogue, so a price changed between adding to
  /// the cart and paying is the price actually charged.
  List<CartLine> _repriced = [];

  CheckoutDraft? get _draft => widget.draft;

  List<CartLine> get _items =>
      _repriced.isNotEmpty ? _repriced : (_draft?.items ?? const []);

  num get _itemsTotal => _repriced.isNotEmpty
      ? _repriced.fold<num>(0, (s, l) => s + l.lineTotal)
      : (_draft?.itemsTotal ?? 0);

  String get _itemsText =>
      _items.map((i) => '${i.quantity} ${i.name}').join(', ');

  num get _dueAmount => _customer?.dueAmount ?? 0;
  num get _walletBalance => _customer?.walletBalance ?? 0;
  num get _expressFee => _expressDelivery ? _charges.expressPrice : 0;

  num get _grandTotal => _itemsTotal + _expressFee + _dueAmount;
  num get _amountAfterDiscount => _grandTotal - _discount;
  num get _walletUsed => _walletBalance < _amountAfterDiscount
      ? _walletBalance
      : _amountAfterDiscount;
  num get _finalAmount {
    final left = _amountAfterDiscount - _walletUsed;
    return left < 0 ? 0 : left;
  }

  String get _garmentNoteKey =>
      'hideGarmentCareNote_${Store.customerId ?? 'anonymous'}';

  DateTime get _pickupDate =>
      _draft?.pickupDate ??
      DateTime.now().add(Duration(
          hours: (_draft?.pickupType == 'now') ? 0 : 24));

  @override
  void initState() {
    super.initState();
    _expressDelivery = Store.getString(Store.kDeliveryType) == 'express';
    _showGarmentNote = Store.getString(_garmentNoteKey) != 'true';
    final draft = _draft;
    if (draft == null || draft.isEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) Navigator.of(context).pushReplacementNamed('/cart');
      });
      return;
    }
    _load();
  }

  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final customerId = Store.customerId;
    final results = await Future.wait([
      Api.vouchers(),
      Api.orderCharges(),
      Api.pricingItems(),
      if (customerId != null) Api.profile(customerId),
      if (customerId != null) Api.myOrders(customerId),
    ]);
    if (!mounted) return;

    setState(() {
      if (results[0].ok) {
        _vouchers = results[0]
            .list
            .whereType<Map>()
            .where((m) => m['isActive'] != false)
            .map((m) => Voucher.fromJson(Map<String, dynamic>.from(m)))
            .where((v) => v.code.isNotEmpty)
            .toList();
      }
      if (results[1].ok) {
        _charges = OrderChargesConfig.fromJson(results[1].map);
        if (!_charges.expressEnabled) {
          _expressDelivery = false;
          Store.setString(Store.kDeliveryType, 'standard');
        }
      }
      if (results[2].ok) {
        // Map each cart line onto the live catalogue entry.
        final catalogue = {
          for (final raw in results[2].list.whereType<Map>())
            (raw['_id'] ?? '').toString():
                PricingItem.fromJson(Map<String, dynamic>.from(raw))
        };
        final draftItems = _draft?.items ?? const <CartLine>[];
        _repriced = [
          for (final line in draftItems)
            CartLine(
              id: line.id,
              name: catalogue[line.id]?.name ?? line.name,
              price: catalogue[line.id]?.price ?? line.price,
              quantity: line.quantity,
              category: catalogue[line.id]?.category ?? line.category,
            ),
        ];
      }
      if (results.length > 3 && results[3].ok) {
        _customer = CustomerProfile.fromJson(results[3].map);
      }
      if (results.length > 4 && results[4].ok) {
        final orders = results[4].list.whereType<Map>().toList();
        if (orders.isNotEmpty) {
          _pastOrder = Map<String, dynamic>.from(orders.first);
        }
      }
    });
  }

  // ---- offers ------------------------------------------------------------

  void _removeVoucher() {
    setState(() {
      _appliedVoucher = null;
      _discount = 0;
      _couponError = '';
    });
  }

  Future<void> _applyCoupon(String code) async {
    final trimmed = code.trim();
    if (trimmed.isEmpty) return;

    final customerId = Store.customerId;
    if (customerId == null) {
      setState(() => _couponError = 'Please login to use coupons');
      return;
    }

    // A code may only be used once, and only a paid order counts as used.
    final orders = await Api.myOrders(customerId);
    if (!mounted) return;
    if (orders.ok) {
      final used = orders.list
          .whereType<Map>()
          .where((o) => o['paymentStatus'] == 'paid')
          .map((o) => (o['appliedVoucherCode'] ?? '').toString().trim())
          .where((c) => c.isNotEmpty)
          .toSet();
      if (used.contains(trimmed)) {
        setState(() {
          _couponError = 'You have already used this coupon';
          _discount = 0;
          _appliedVoucher = null;
        });
        return;
      }
    }

    final live = await Api.vouchers();
    if (!mounted) return;
    if (!live.ok) {
      setState(() => _couponError = 'Failed to apply coupon');
      return;
    }

    Voucher? match;
    for (final raw in live.list.whereType<Map>()) {
      final map = Map<String, dynamic>.from(raw);
      if ((map['code'] ?? '').toString() == trimmed && map['isActive'] != false) {
        match = Voucher.fromJson(map);
        break;
      }
    }

    setState(() {
      if (match == null) {
        _couponError = 'Invalid or inactive coupon code';
        _discount = 0;
        _appliedVoucher = null;
      } else {
        // The discount is a percentage of the garments only, never of the due
        // or the express fee.
        _discount = (_itemsTotal * match.discount / 100).floor();
        _appliedVoucher = match;
        _couponError = '';
      }
    });
  }

  void _showOffersSheet() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) => SafeArea(
        top: false,
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.75,
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
                        'Offers for you',
                        style: TextStyle(
                          fontFamily: 'Montserrat',
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: Brand.mutedForeground),
                      onPressed: () => Navigator.of(sheetContext).pop(),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              Flexible(
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: _vouchers.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (_, i) {
                    final voucher = _vouchers[i];
                    final applied = _appliedVoucher?.code == voucher.code;
                    return Padding(
                      padding:
                          const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      voucher.code,
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: 0.5,
                                        color: Brand.purple,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFEDE9FE),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        '${voucher.discount}% OFF',
                                        style: const TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w700,
                                          color: Brand.purple,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                if ((voucher.slogan ?? '').isNotEmpty)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 2),
                                    child: Text(
                                      voucher.slogan!,
                                      style: const TextStyle(
                                        fontSize: 11.5,
                                        color: Brand.gray600,
                                        height: 1.4,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          if (applied)
                            const Padding(
                              padding: EdgeInsets.symmetric(horizontal: 12),
                              child: Text(
                                'APPLIED',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: Brand.green600,
                                ),
                              ),
                            )
                          else
                            TextButton(
                              onPressed: () {
                                Navigator.of(sheetContext).pop();
                                _applyCoupon(voucher.code);
                              },
                              child: const Text(
                                'APPLY',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: Brand.cyan,
                                ),
                              ),
                            ),
                        ],
                      ),
                    );
                  },
                ),
              ),
              if (_appliedVoucher != null) ...[
                const Divider(height: 1),
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: TextButton(
                    onPressed: () {
                      Navigator.of(sheetContext).pop();
                      _removeVoucher();
                    },
                    child: const Text(
                      'Remove offer',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Brand.mutedForeground,
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  // ---- policies ----------------------------------------------------------

  void _showPolicy(String which) {
    final title = which == 'garment-care'
        ? 'Garment Care Policy'
        : which == 'damage-loss'
            ? 'Damage/Loss Policy'
            : 'Terms & Conditions';

    // Admin-supplied policy text wins; otherwise the matching Terms section is
    // shown, which is the section the web screen scrolled to.
    final adminText = which == 'garment-care'
        ? _charges.garmentCarePolicyText
        : which == 'damage-loss'
            ? _charges.damageLossPolicyText
            : '';

    List<LegalSection> sections;
    if (which == 'garment-care') {
      sections = termsSections
          .where((s) => (s.heading ?? '').contains('Garment Care'))
          .toList();
    } else if (which == 'damage-loss') {
      sections = termsSections
          .where((s) => (s.heading ?? '').contains('Damaged or Lost'))
          .toList();
    } else {
      sections = termsSections;
    }
    if (sections.isEmpty) sections = termsSections;

    showDialog<void>(
      context: context,
      builder: (dialogContext) => Dialog(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.85,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 8, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        title,
                        style: const TextStyle(
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
              Expanded(
                child: SingleChildScrollView(
                  child: adminText.isNotEmpty
                      ? Padding(
                          padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
                          child: Text(
                            adminText,
                            style: const TextStyle(
                              fontSize: 13.5,
                              height: 1.65,
                              color: Color(0xFF1F2937),
                            ),
                          ),
                        )
                      : LegalBody(sections: sections),
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

  void _showExpressInfo() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) => SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  height: 4,
                  width: 40,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE2E8F0),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Container(
                    height: 42,
                    width: 42,
                    decoration: BoxDecoration(
                      gradient: Brand.gradient,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.schedule,
                        color: Colors.white, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _charges.expressLabel,
                          style: const TextStyle(
                            fontFamily: 'Montserrat',
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                            color: Brand.foreground,
                          ),
                        ),
                        Text(
                          '+${rupees(_charges.expressPrice)} per order',
                          style: const TextStyle(
                              fontSize: 12.5, color: Color(0xFF94A3B8)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                _charges.expressDescription.isNotEmpty
                    ? _charges.expressDescription
                    : 'Your clothes will be picked up and delivered within a '
                        '12-hour turnaround.',
                style: const TextStyle(
                    fontSize: 14.5, height: 1.6, color: Brand.gray600),
              ),
              const SizedBox(height: 20),
              GradientButton(
                label: 'Got it',
                height: 48,
                radius: 14,
                onPressed: () => Navigator.of(sheetContext).pop(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _warn({
    required String emoji,
    required String title,
    required String message,
    required String actionLabel,
    required String route,
  }) async {
    final go = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => Dialog(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                height: 64,
                width: 64,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFFF59E0B), Color(0xFFEF4444)],
                  ),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(emoji, style: const TextStyle(fontSize: 28)),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontFamily: 'Montserrat',
                  fontSize: 19,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(
                    fontSize: 13.5, height: 1.6, color: Brand.gray600),
              ),
              const SizedBox(height: 22),
              Row(
                children: [
                  Expanded(
                    child: SizedBox(
                      height: 48,
                      child: OutlinedButton(
                        onPressed: () => Navigator.of(dialogContext).pop(false),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Brand.purple, width: 2),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text('Close',
                            style: TextStyle(color: Brand.purple)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: GradientButton(
                      label: actionLabel,
                      height: 48,
                      radius: 12,
                      fontSize: 14,
                      onPressed: () => Navigator.of(dialogContext).pop(true),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
    if (go == true && mounted) {
      await Navigator.of(context).pushNamed(route);
      if (mounted) await _reloadCustomer();
    }
  }

  /// Re-reads the customer after a screen that can change their address or
  /// payment methods.
  Future<void> _reloadCustomer() async {
    final customerId = Store.customerId;
    if (customerId == null) return;
    final result = await Api.profile(customerId);
    if (!mounted || !result.ok) return;
    setState(() => _customer = CustomerProfile.fromJson(result.map));
  }

  // ---- placing the order -------------------------------------------------

  Map<String, dynamic> _orderPayload({
    required String customerId,
    required String paymentMethod,
    String? razorpayOrderId,
    String? razorpayPaymentId,
  }) {
    final address = _customer?.defaultAddress;
    return {
      'customerId': customerId,
      'items': _items.map((i) => i.toOrderItem()).toList(),
      'totalAmount': _amountAfterDiscount,
      if (address != null) 'pickupAddress': address.toJson(),
      'pickupSlot': _draft?.selectedSlot ?? 'Next Available',
      'pickupDate': _pickupDate.toIso8601String(),
      'paymentMethod': paymentMethod,
      'paymentStatus': 'paid',
      if (razorpayOrderId != null) 'razorpayOrderId': razorpayOrderId,
      if (razorpayPaymentId != null) 'razorpayPaymentId': razorpayPaymentId,
      'walletUsed': _walletUsed,
      'discountAmount': _discount,
      'appliedVoucherCode': _appliedVoucher?.code,
      'specialInstructions':
          _notes.text.trim().isEmpty ? null : _notes.text.trim(),
      'expressDelivery': _expressDelivery,
      'expressDeliveryFee': _expressFee,
    };
  }

  Future<void> _continue() async {
    if (_placing) return;

    final customerId = Store.customerId;
    if (customerId == null) {
      showToast(context, 'Please login to place order', error: true);
      return;
    }

    // Express may have been switched off by an admin after this screen loaded.
    if (_expressDelivery) {
      final charges = await Api.orderCharges();
      if (!mounted) return;
      if (charges.ok && charges.map['expressDeliveryEnabled'] == false) {
        setState(() {
          _charges = OrderChargesConfig.fromJson(charges.map);
          _expressDelivery = false;
        });
        await Store.setString(Store.kDeliveryType, 'standard');
        if (!mounted) return;
        showToast(
          context,
          'Express Delivery is no longer available. Your total has been '
          'updated to Standard Delivery. Please review it and tap Continue again.',
          error: true,
        );
        return;
      }
    }

    if (_customer?.defaultAddress == null) {
      await _warn(
        emoji: '\u{1F4CD}',
        title: 'Address Required',
        message: 'Please add a delivery address before placing order.',
        actionLabel: 'Add Address',
        route: '/add-address',
      );
      return;
    }

    final methods = _customer?.paymentMethods ?? const <PaymentMethod>[];
    if (methods.isEmpty) {
      await _warn(
        emoji: '⚠️',
        title: 'Payment Method Required',
        message: 'Please add a payment method before placing order. '
            'Go to Profile → Payment Methods to add one.',
        actionLabel: 'Go to Profile',
        route: '/profile',
      );
      return;
    }

    final primary = _customer?.primaryPaymentMethod;
    if (primary == null) {
      await _warn(
        emoji: '⚠️',
        title: 'Payment Method Required',
        message: 'Please set a primary payment method before placing order. '
            'Go to Profile → Payment Methods and mark one as primary.',
        actionLabel: 'Go to Profile',
        route: '/profile',
      );
      return;
    }

    setState(() => _placing = true);

    // The wallet covers everything: no payment sheet, straight to the order.
    if (_finalAmount == 0) {
      final created = await Api.createOrder(_orderPayload(
        customerId: customerId,
        paymentMethod: 'Wallet',
      ));
      if (!mounted) return;
      setState(() => _placing = false);
      if (created.ok) {
        await _onPlaced(created, paidOnline: 0);
      } else {
        showToast(context, 'Failed to place order. Please try again.',
            error: true);
      }
      return;
    }

    final payment = await Payments.charge(
      amount: _finalAmount,
      description: 'Laundry Service Payment',
      receipt: 'order_${DateTime.now().millisecondsSinceEpoch}',
      contact: _customer?.mobile,
      email: _customer?.email,
    );
    if (!mounted) return;

    if (payment.cancelled) {
      setState(() => _placing = false);
      return;
    }
    if (!payment.paid) {
      setState(() => _placing = false);
      showToast(context, payment.message ?? 'Payment failed', error: true);
      return;
    }

    final created = await Api.createOrder(_orderPayload(
      customerId: customerId,
      paymentMethod: primary.type,
      razorpayOrderId: payment.orderId,
      razorpayPaymentId: payment.paymentId,
    ));
    if (!mounted) return;
    setState(() => _placing = false);

    if (created.ok) {
      await _onPlaced(created, paidOnline: _finalAmount);
    } else {
      // The money has left their account, so this cannot be a quiet failure.
      showToast(
        context,
        'Payment successful but order placement failed. Please contact support '
        'with payment id ${payment.paymentId}.',
        error: true,
      );
    }
  }

  Future<void> _onPlaced(ApiResult created, {required num paidOnline}) async {
    await Cart.clear();
    if (!mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil(
      '/booking-confirmation',
      (route) => route.settings.name == '/home',
      arguments: {
        'orderId': created.map['orderId']?.toString() ?? '',
        'items': _itemsText,
        'total': _amountAfterDiscount,
        'originalTotal': _itemsTotal,
        'discount': _discount,
        'walletUsed': _walletUsed,
        'previousDue': _dueAmount,
        'paidOnline': paidOnline,
        'voucherCode': _appliedVoucher?.code,
        'selectedSlot': _draft?.selectedSlot,
        'pickupDayLabel': _draft?.pickupDayLabel,
        'expressDelivery': _expressDelivery,
        'expressDeliveryFee': _expressFee,
        'expectedDeliveryAt': created.map['expectedDeliveryAt']?.toString(),
      },
    );
  }

  // ---- layout ------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final draft = _draft;
    if (draft == null || draft.isEmpty) {
      return const Scaffold(body: SizedBox.shrink());
    }

    return Scaffold(
      backgroundColor: Brand.gray50,
      appBar: const AppHeader(title: 'Final Step', gradient: true, backTo: '/home'),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          _orderCard(),
          const SizedBox(height: 16),
          _addressCard(),
          if (_pastOrder != null) ...[
            const SizedBox(height: 16),
            _sectionTitle('Past Orders'),
            _pastOrderCard(),
          ],
          const SizedBox(height: 16),
          _sectionTitle('Additional Information'),
          _infoCard(),
          const SizedBox(height: 16),
          _sectionTitle('Additional Notes'),
          _notesCard(),
          if (_charges.expressEnabled && _charges.expressPrice > 0) ...[
            const SizedBox(height: 16),
            _sectionTitle(_charges.expressLabel),
            _expressCard(),
          ],
          const SizedBox(height: 16),
          _sectionTitle('Offers & Payment'),
          _offersAndTotals(),
          const SizedBox(height: 16),
          _policyCard(),
          const SizedBox(height: 16),
          GradientButton(
            label: _placing ? 'Processing...' : 'Continue',
            busy: _placing,
            height: 52,
            onPressed: (_placing || !_policyAcknowledged) ? null : _continue,
          ),
          if (!_policyAcknowledged)
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Text(
                'Please tick the box above to continue.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: Brand.mutedForeground),
              ),
            ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Text(
          text,
          style: const TextStyle(
            fontFamily: 'Montserrat',
            fontSize: 17,
            fontWeight: FontWeight.w700,
          ),
        ),
      );

  Widget _card({required Widget child, EdgeInsets? padding}) => Container(
        width: double.infinity,
        padding: padding ?? const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: const [
            BoxShadow(
                color: Color(0x14000000), blurRadius: 12, offset: Offset(0, 4)),
          ],
        ),
        child: child,
      );

  Widget _orderCard() {
    return _card(
      child: Row(
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
                // Deliberately not an order number: the real one is issued by
                // the server when the order is created. The web screen printed
                // a random five-digit number here, which looked like an id and
                // was not one.
                Text(
                  '${_items.length} item${_items.length == 1 ? '' : 's'} to be picked up',
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, fontSize: 14.5),
                ),
                const SizedBox(height: 2),
                Text(
                  _itemsText,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12.5, color: Brand.mutedForeground),
                ),
                const SizedBox(height: 2),
                GradientText(
                  rupees(_itemsTotal),
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    fontFamily: 'Montserrat',
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _addressCard() {
    final address = _customer?.defaultAddress;
    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (address == null)
            const NoAddressMap()
          else
            AddressMap(address: address),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: () async {
                await Navigator.of(context).pushNamed('/add-address');
                await _reloadCustomer();
              },
              child: const Text(
                'Change location',
                style: TextStyle(
                  fontSize: 12,
                  color: Brand.mutedForeground,
                  decoration: TextDecoration.underline,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _pastOrderCard() {
    final order = _pastOrder!;
    final items = order['items'];
    final itemsText = (items is List)
        ? items
            .whereType<Map>()
            .map((i) => '${i['quantity']} ${i['name']}')
            .join(', ')
        : 'No items';

    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Order #${order['orderId'] ?? ''}',
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, fontSize: 14.5),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  gradient: Brand.gradient,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  (order['status'] ?? '').toString(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            itemsText.isEmpty ? 'No items' : itemsText,
            style: const TextStyle(fontSize: 12.5, color: Brand.mutedForeground),
          ),
          const SizedBox(height: 6),
          GestureDetector(
            onTap: () => Navigator.of(context).pushNamed(
              '/order-details',
              arguments: {'orderId': order['orderId']?.toString()},
            ),
            child: const GradientText(
              'View Details',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  Widget _infoCard() {
    final address = _customer?.defaultAddress;
    final method = _customer?.primaryPaymentMethod ??
        (_customer?.paymentMethods.isNotEmpty == true
            ? _customer!.paymentMethods.first
            : null);
    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _infoLine('Delivery Address: ${address?.oneLine ?? 'No address found'}'),
          _infoLine(
              'Contact Number: ${(_customer?.mobile.isNotEmpty == true && _customer!.hasRealMobile) ? _customer!.mobile : 'Not provided'}'),
          _infoLine(
              'Email: ${(_customer?.email.isNotEmpty == true) ? _customer!.email : 'Not provided'}'),
          _infoLine(
              'Payment Method: ${method?.type ?? 'Please add payment method on profile'}'),
        ],
      ),
    );
  }

  Widget _infoLine(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(
          text,
          style: const TextStyle(fontSize: 13, color: Brand.gray600, height: 1.5),
        ),
      );

  Widget _notesCard() {
    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: _notes,
            maxLines: 3,
            maxLength: 200,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              hintText:
                  'Add any special instructions for pickup/delivery (optional)...',
              hintStyle: const TextStyle(fontSize: 13.5, color: Brand.mutedForeground),
              counterText: '',
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide:
                    const BorderSide(color: Color(0xFFD1D5DB), width: 2),
              ),
            ),
            style: const TextStyle(fontSize: 14),
          ),
          const SizedBox(height: 6),
          Text(
            '${_notes.text.length}/200 characters',
            style: const TextStyle(fontSize: 12, color: Brand.mutedForeground),
          ),
        ],
      ),
    );
  }

  Widget _expressCard() {
    return _card(
      child: Row(
        children: [
          Container(
            height: 38,
            width: 38,
            decoration: BoxDecoration(
              gradient: Brand.gradient,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.schedule, color: Colors.white, size: 19),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Row(
              children: [
                Flexible(
                  child: Text(
                    _charges.expressLabel,
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 14.5),
                  ),
                ),
                if (_charges.expressDescription.isNotEmpty) ...[
                  const SizedBox(width: 6),
                  GestureDetector(
                    onTap: _showExpressInfo,
                    child: Container(
                      height: 20,
                      width: 20,
                      decoration: BoxDecoration(
                        gradient: Brand.gradient,
                        shape: BoxShape.circle,
                      ),
                      child: const Center(
                        child: Text(
                          'i',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          GradientText(
            '+${rupees(_charges.expressPrice)}',
            style: const TextStyle(
                fontWeight: FontWeight.w700, fontSize: 14.5),
          ),
          const SizedBox(width: 8),
          Switch(
            value: _expressDelivery,
            activeThumbColor: Colors.white,
            activeTrackColor: Brand.purple,
            onChanged: (on) async {
              setState(() => _expressDelivery = on);
              await Store.setString(
                  Store.kDeliveryType, on ? 'express' : 'standard');
            },
          ),
        ],
      ),
    );
  }

  Widget _offersAndTotals() {
    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_vouchers.isNotEmpty && _appliedVoucher == null)
            _offersRow()
          else if (_appliedVoucher != null)
            _appliedRow(),
          if (_couponError.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Text(
                _couponError,
                style: const TextStyle(color: Brand.destructive, fontSize: 13),
              ),
            ),
          const SizedBox(height: 14),
          // Grand Total -> Discount -> Wallet used -> Amount to Pay, in that
          // order, so the cost, what came off and what is still owed are plain.
          _totalRow('Items total', rupees(_itemsTotal)),
          if (_expressDelivery && _expressFee > 0)
            _totalRow('Express delivery fee', '+${rupees(_expressFee)}'),
          if (_dueAmount > 0)
            _totalRow('Previous pending due', '+${rupees(_dueAmount)}',
                color: Brand.destructive),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: Divider(height: 1),
          ),
          _totalRow('Grand Total (incl. GST)', rupees(_grandTotal),
              bold: true),
          _totalRow(
            _appliedVoucher == null
                ? 'Discount / Voucher'
                : 'Discount (${_appliedVoucher!.code})',
            _discount > 0 ? '-${rupees(_discount)}' : rupees(0),
            color: Brand.green600,
          ),
          _totalRow(
            'Paid from Urban Steam Wallet',
            _walletUsed > 0 ? '-${rupees(_walletUsed)}' : rupees(0),
            color: const Color(0xFF2563EB),
          ),
          if (_walletBalance > 0)
            _totalRow('Wallet balance available', rupees(_walletBalance),
                color: Brand.mutedForeground, small: true),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: Divider(height: 1),
          ),
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Amount to Pay',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
                ),
              ),
              Text(
                rupees(_finalAmount),
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  fontFamily: 'Montserrat',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// Offers open in their own sheet, listed as rows. They used to sit inline on
  /// the booking screen, which pushed the total and the pay button down the
  /// page as soon as more than one voucher was live.
  Widget _offersRow() {
    return Material(
      color: const Color(0xFFFAF8FF),
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: _showOffersSheet,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: Brand.purple.withValues(alpha: 0.35),
              width: 2,
              strokeAlign: BorderSide.strokeAlignInside,
            ),
          ),
          child: Row(
            children: [
              Container(
                height: 36,
                width: 36,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Brand.purple, Brand.cyan],
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.local_offer,
                    color: Colors.white, size: 17),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'View all offers',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: Brand.purple,
                      ),
                    ),
                    Text(
                      '${_vouchers.length} offer${_vouchers.length > 1 ? 's' : ''} available',
                      style: const TextStyle(fontSize: 11, color: Brand.mutedForeground),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, size: 20, color: Brand.purple),
            ],
          ),
        ),
      ),
    );
  }

  Widget _appliedRow() {
    final voucher = _appliedVoucher!;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFBBF7D0), width: 2),
      ),
      child: Row(
        children: [
          Container(
            height: 36,
            width: 36,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF16A34A), Brand.cyan],
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.check, color: Colors.white, size: 19),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${voucher.code} applied',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF15803D),
                  ),
                ),
                Text(
                  'You saved ${rupees(_discount)}'
                  '${(voucher.slogan ?? '').isEmpty ? '' : ' · ${voucher.slogan}'}',
                  style: const TextStyle(
                    fontSize: 11,
                    height: 1.4,
                    color: Color(0xFF166534),
                  ),
                ),
              ],
            ),
          ),
          if (_vouchers.length > 1)
            TextButton(
              onPressed: _showOffersSheet,
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                minimumSize: const Size(0, 0),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: const Text(
                'Change',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: Brand.purple,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _totalRow(
    String label,
    String value, {
    Color? color,
    bool bold = false,
    bool small = false,
  }) {
    final style = TextStyle(
      fontSize: small ? 12 : 13.5,
      color: color,
      fontWeight: bold ? FontWeight.w600 : FontWeight.w400,
    );
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Expanded(
            child: Text(label,
                style: style.copyWith(color: color ?? Brand.gray600)),
          ),
          Text(value, style: style.copyWith(color: color ?? Colors.black)),
        ],
      ),
    );
  }

  Widget _policyCard() {
    return _card(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // The care note is the same text every single order, so it can be
          // turned off. The agreement checkbox below it always stays.
          if (_showGarmentNote) ...[
            const Text(
              'Garment care note',
              style: TextStyle(
                fontFamily: 'Montserrat',
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Urban Steam provides steam ironing services. Steam ironing and '
              'transportation may result in very minor wrinkles, folds or '
              'compression during handling and transit. Results may also vary '
              'depending on the fabric, construction and existing condition of '
              'each garment.',
              style: TextStyle(fontSize: 12.5, height: 1.6, color: Brand.gray600),
            ),
            const SizedBox(height: 6),
            GestureDetector(
              onTap: () async {
                await Store.setString(_garmentNoteKey, 'true');
                if (mounted) setState(() => _showGarmentNote = false);
              },
              child: const Text(
                "Don't show this again",
                style: TextStyle(
                  fontSize: 11,
                  color: Brand.mutedForeground,
                  decoration: TextDecoration.underline,
                ),
              ),
            ),
            const SizedBox(height: 14),
          ],
          GestureDetector(
            onTap: () =>
                setState(() => _policyAcknowledged = !_policyAcknowledged),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  height: 21,
                  width: 21,
                  margin: const EdgeInsets.only(top: 1),
                  decoration: BoxDecoration(
                    gradient: _policyAcknowledged ? Brand.gradient : null,
                    color: _policyAcknowledged ? null : Colors.white,
                    borderRadius: BorderRadius.circular(5),
                    border: _policyAcknowledged
                        ? null
                        : Border.all(color: Brand.disabled, width: 2),
                  ),
                  child: _policyAcknowledged
                      ? const Icon(Icons.check, size: 15, color: Colors.white)
                      : null,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Wrap(
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      const Text(
                        "I have read and understood the above and agree to Urban Steam's ",
                        style: TextStyle(fontSize: 13.5, height: 1.5),
                      ),
                      GestureDetector(
                        onTap: () => _showPolicy('terms'),
                        child: const Text(
                          'Terms & Conditions',
                          style: TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w500,
                            color: Brand.purple,
                            decoration: TextDecoration.underline,
                            decorationColor: Brand.purple,
                          ),
                        ),
                      ),
                      const Text('.', style: TextStyle(fontSize: 13.5)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 14,
            runSpacing: 4,
            children: [
              GestureDetector(
                onTap: () => _showPolicy('garment-care'),
                child: const Text(
                  'Garment Care Policy',
                  style: TextStyle(
                    fontSize: 11.5,
                    color: Brand.purple,
                    decoration: TextDecoration.underline,
                    decorationColor: Brand.purple,
                  ),
                ),
              ),
              GestureDetector(
                onTap: () => _showPolicy('damage-loss'),
                child: const Text(
                  'Damage/Loss Policy',
                  style: TextStyle(
                    fontSize: 11.5,
                    color: Brand.purple,
                    decoration: TextDecoration.underline,
                    decorationColor: Brand.purple,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
