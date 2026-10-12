import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/catalogue.dart';
import '../services/api.dart';
import '../services/invoice.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/remote_image.dart';
import '../widgets/common.dart';

class _Subscription {
  const _Subscription({
    required this.id,
    required this.planName,
    required this.status,
    required this.price,
    required this.walletCredit,
    required this.purchasedAt,
    this.image,
    this.paymentId,
  });

  /// The document's own `_id`. The receipt is numbered by its last eight
  /// characters, as the web screen numbers it.
  final String id;

  final String planName;
  final String status;

  String get receiptId {
    final tail = id.length > 8 ? id.substring(id.length - 8) : id;
    return tail.toUpperCase();
  }

  final num price;
  final num walletCredit;
  final DateTime? purchasedAt;
  final String? image;
  final String? paymentId;
}

class MySubscriptionScreen extends StatefulWidget {
  const MySubscriptionScreen({super.key});

  @override
  State<MySubscriptionScreen> createState() => _MySubscriptionScreenState();
}

class _MySubscriptionScreenState extends State<MySubscriptionScreen> {
  static final _stamp = DateFormat('dd MMM yyyy, hh:mm a');

  List<_Subscription> _subscriptions = [];
  bool _loading = true;

  /// Printed on the receipt. The profile is the source; what is stored on the
  /// phone is only a fallback, and is empty after a social sign-in.
  String? _customerName;
  String? _customerMobile;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final customerId = Store.customerId;
    if (customerId == null) {
      if (mounted) {
        Navigator.of(context).pushNamedAndRemoveUntil('/login', (r) => false);
      }
      return;
    }
    final results = await Future.wait([
      Api.mySubscriptions(customerId),
      Api.profile(customerId),
    ]);
    if (!mounted) return;
    final result = results[0];

    final profile = results[1];
    if (profile.ok) {
      final name = (profile.map['name'] ?? '').toString().trim();
      final mobile = (profile.map['mobile'] ?? '').toString().trim();
      _customerName = name.isEmpty ? null : name;
      _customerMobile =
          (mobile.isEmpty ||
              mobile.startsWith('google_') ||
              mobile.startsWith('apple_'))
          ? null
          : mobile;
    }
    setState(() {
      if (result.ok) {
        _subscriptions = result.list.whereType<Map>().map((raw) {
          final sub = Map<String, dynamic>.from(raw);
          final plan = sub['planId'];
          final planMap = plan is Map
              ? Map<String, dynamic>.from(plan)
              : const {};
          return _Subscription(
            id: (sub['_id'] ?? '').toString(),
            planName: (sub['planName'] ?? planMap['name'] ?? 'Plan').toString(),
            status: (sub['status'] ?? '').toString(),
            price:
                num.tryParse(
                  (sub['amount'] ?? planMap['price'] ?? '').toString(),
                ) ??
                0,
            walletCredit:
                num.tryParse(
                  (sub['walletCredit'] ?? planMap['walletCredit'] ?? '')
                      .toString(),
                ) ??
                0,
            purchasedAt: DateTime.tryParse(
              sub['createdAt']?.toString() ?? '',
            )?.toLocal(),
            image: absoluteUrl(planMap['image']),
            paymentId: sub['razorpayPaymentId']?.toString(),
          );
        }).toList();
      }
      _loading = false;
    });
  }

  ({Color background, Color text}) _statusColours(String status) {
    switch (status) {
      case 'active':
        return (
          background: const Color(0xFFDCFCE7),
          text: const Color(0xFF16A34A),
        );
      case 'pending':
        return (
          background: const Color(0xFFFEF3C7),
          text: const Color(0xFFD97706),
        );
      default:
        return (
          background: const Color(0xFFFEE2E2),
          text: const Color(0xFFDC2626),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Brand.gray50,
      appBar: const AppHeader(title: 'My Wallet Plans', gradient: true),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Brand.purple))
          : _subscriptions.isEmpty
          ? Padding(
              // `text-align: center; padding: 3rem 1rem` -- near the top of
              // the page, not centred in what is left of it.
              padding: const EdgeInsets.fromLTRB(16, 48, 16, 48),
              // `text-align: center` centres each line across the whole page,
              // not around the widest of them, so the column has to be told to
              // take the full width.
              child: SizedBox(
                width: double.infinity,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('\u{1F4CB}', style: TextStyle(fontSize: 48)),
                    const SizedBox(height: 12), // 0.75rem
                    const Text(
                      'No subscriptions yet.',
                      style: TextStyle(color: Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 16), // 1rem
                    SizedBox(
                      // `padding: 0.75rem 1.5rem` around the label, so the
                      // button is only as wide as its text.
                      width: 152,
                      height: 44,
                      child: GradientButton(
                        label: 'Browse Plans',
                        radius: 12,
                        fontWeight: FontWeight.w700,
                        onPressed: () => Navigator.of(
                          context,
                        ).pushReplacementNamed('/subscriptions'),
                      ),
                    ),
                  ],
                ),
              ),
            )
          : RefreshIndicator(
              onRefresh: _load,
              color: Brand.purple,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 18, 16, 28),
                children: [
                  for (final subscription in _subscriptions)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: _card(subscription),
                    ),
                ],
              ),
            ),
    );
  }

  Widget _card(_Subscription subscription) {
    final colours = _statusColours(subscription.status);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                height: 52,
                width: 52,
                clipBehavior: Clip.antiAlias,
                decoration: BoxDecoration(
                  gradient: subscription.image == null
                      ? Brand.deepGradient
                      : null,
                  color: subscription.image == null
                      ? null
                      : const Color(0xFFF3F4F6),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: subscription.image == null
                    ? const Center(
                        child: Text(
                          '\u{1F48E}',
                          style: TextStyle(fontSize: 22),
                        ),
                      )
                    : RemoteImage(
                        url: subscription.image,
                        decodeWidth: 56,
                        fallback: const Center(
                          child: Text(
                            '\u{1F48E}',
                            style: TextStyle(fontSize: 22),
                          ),
                        ),
                      ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      subscription.planName,
                      style: const TextStyle(
                        fontFamily: 'Montserrat',
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Brand.foreground,
                      ),
                    ),
                    if (subscription.purchasedAt != null)
                      Text(
                        _stamp.format(subscription.purchasedAt!),
                        style: const TextStyle(
                          fontSize: 12,
                          color: Brand.mutedForeground,
                        ),
                      ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 3,
                ),
                decoration: BoxDecoration(
                  color: colours.background,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  subscription.status.isEmpty
                      ? 'Unknown'
                      : subscription.status[0].toUpperCase() +
                            subscription.status.substring(1),
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    color: colours.text,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _tile(
                  'Amount Paid',
                  rupees(subscription.price),
                  background: const Color(0xFFF8FAFC),
                  labelColour: const Color(0xFF94A3B8),
                  valueColour: const Color(0xFF1E293B),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _tile(
                  'Wallet Credited',
                  rupees(subscription.walletCredit),
                  background: const Color(0xFFF0FDF4),
                  labelColour: const Color(0xFF86EFAC),
                  valueColour: const Color(0xFF16A34A),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          SizedBox(
            height: 36,
            width: double.infinity,
            child: GradientButton(
              label: 'View Receipt',
              radius: 10,
              fontSize: 13.5,
              shadow: false,
              onPressed: () => _showReceipt(subscription),
            ),
          ),
        ],
      ),
    );
  }

  Widget _tile(
    String label,
    String value, {
    required Color background,
    required Color labelColour,
    required Color valueColour,
  }) => Container(
    padding: const EdgeInsets.all(10),
    decoration: BoxDecoration(
      color: background,
      borderRadius: BorderRadius.circular(10),
    ),
    child: Column(
      children: [
        Text(label, style: TextStyle(fontSize: 11, color: labelColour)),
        const SizedBox(height: 3),
        Text(
          value,
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: valueColour,
          ),
        ),
      ],
    ),
  );

  /// The modal the web screen opens: the brand name, a dashed-rule block of
  /// six lines, and a download beside a close.
  Future<void> _showReceipt(_Subscription subscription) async {
    var downloading = false;
    await showDialog<void>(
      context: context,
      barrierColor: const Color(0x99000000), // rgba(0,0,0,0.6)
      builder: (dialogContext) => StatefulBuilder(
        builder: (dialogContext, setDialogState) => Dialog(
          backgroundColor: Colors.white,
          insetPadding: const EdgeInsets.all(16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 360),
            child: Padding(
              padding: const EdgeInsets.all(28), // 1.75rem
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const GradientText(
                    'Urban Steam',
                    style: TextStyle(
                      fontFamily: 'Montserrat',
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 3),
                  const Text(
                    'Invoice / Receipt',
                    style: TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                  ),
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: const BoxDecoration(
                      border: Border(
                        top: BorderSide(color: Color(0xFFE2E8F0)),
                        bottom: BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                    ),
                    child: Column(
                      children: [
                        _receiptRow('Order #', subscription.receiptId),
                        _receiptRow('Plan', subscription.planName),
                        _receiptRow(
                          'Date',
                          subscription.purchasedAt == null
                              ? ''
                              : _stamp.format(subscription.purchasedAt!),
                        ),
                        _receiptRow('Amount Paid', rupees(subscription.price)),
                        _receiptRow(
                          'Wallet Credited',
                          rupees(subscription.walletCredit),
                          valueColour: const Color(0xFF16A34A),
                        ),
                        _receiptRow(
                          'Status',
                          subscription.status.isEmpty
                              ? 'Unknown'
                              : subscription.status[0].toUpperCase() +
                                    subscription.status.substring(1),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: SizedBox(
                          height: 44,
                          child: GradientButton(
                            label: downloading
                                ? 'Generating...'
                                : '↓ Download PDF',
                            radius: 12,
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            busy: downloading,
                            disabledLook: DisabledLook.flatGrey,
                            onPressed: downloading
                                ? null
                                : () async {
                                    setDialogState(() => downloading = true);
                                    final error = await _downloadReceipt(
                                      subscription,
                                    );
                                    if (!dialogContext.mounted) return;
                                    setDialogState(() => downloading = false);
                                    if (error != null) {
                                      showToast(
                                        dialogContext,
                                        error,
                                        error: true,
                                      );
                                    }
                                  },
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: SizedBox(
                          height: 44,
                          child: OutlinedButton(
                            onPressed: () => Navigator.of(dialogContext).pop(),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(
                                color: Brand.purple,
                                width: 2,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: const Text(
                              'Close',
                              style: TextStyle(
                                fontFamily: 'Montserrat',
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: Brand.purple,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<String?> _downloadReceipt(_Subscription subscription) =>
      Invoice.shareForSubscription(
        receiptId: subscription.receiptId,
        planName: subscription.planName,
        price: subscription.price,
        walletCredited: subscription.walletCredit,
        purchasedAt: subscription.purchasedAt,
        paymentId: subscription.paymentId,
        customerName: _customerName,
        customerMobile: _customerMobile,
      );

  Widget _receiptRow(
    String label,
    String value, {
    Color valueColour = const Color(0xFF1E293B),
  }) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: TextStyle(
              fontSize: 13.5,
              fontWeight: FontWeight.w600,
              color: valueColour,
            ),
          ),
        ),
      ],
    ),
  );
}
