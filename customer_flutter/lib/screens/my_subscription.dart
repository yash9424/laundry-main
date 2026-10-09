import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/catalogue.dart';
import '../services/api.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/common.dart';

class _Subscription {
  const _Subscription({
    required this.planName,
    required this.status,
    required this.price,
    required this.walletCredit,
    required this.purchasedAt,
    this.image,
    this.paymentId,
  });

  final String planName;
  final String status;
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
    final result = await Api.mySubscriptions(customerId);
    if (!mounted) return;
    setState(() {
      if (result.ok) {
        _subscriptions = result.list.whereType<Map>().map((raw) {
          final sub = Map<String, dynamic>.from(raw);
          final plan = sub['planId'];
          final planMap =
              plan is Map ? Map<String, dynamic>.from(plan) : const {};
          return _Subscription(
            planName: (sub['planName'] ?? planMap['name'] ?? 'Plan').toString(),
            status: (sub['status'] ?? '').toString(),
            price: num.tryParse(
                    (sub['amount'] ?? planMap['price'] ?? '').toString()) ??
                0,
            walletCredit: num.tryParse(
                    (sub['walletCredit'] ?? planMap['walletCredit'] ?? '')
                        .toString()) ??
                0,
            purchasedAt:
                DateTime.tryParse(sub['createdAt']?.toString() ?? '')?.toLocal(),
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
        return (background: const Color(0xFFDCFCE7), text: const Color(0xFF16A34A));
      case 'pending':
        return (background: const Color(0xFFFEF3C7), text: const Color(0xFFD97706));
      default:
        return (background: const Color(0xFFFEE2E2), text: const Color(0xFFDC2626));
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
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text('\u{1F48E}', style: TextStyle(fontSize: 48)),
                        const SizedBox(height: 14),
                        const Text(
                          'No wallet plans yet',
                          style: TextStyle(
                            fontFamily: 'Montserrat',
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Top up your wallet and get more to spend.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Brand.mutedForeground),
                        ),
                        const SizedBox(height: 20),
                        SizedBox(
                          width: 220,
                          child: GradientButton(
                            label: 'See the plans',
                            height: 48,
                            onPressed: () => Navigator.of(context)
                                .pushReplacementNamed('/subscriptions'),
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
          BoxShadow(color: Color(0x14000000), blurRadius: 12, offset: Offset(0, 4)),
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
                  gradient:
                      subscription.image == null ? Brand.deepGradient : null,
                  color: subscription.image == null
                      ? null
                      : const Color(0xFFF3F4F6),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: subscription.image == null
                    ? const Center(
                        child: Text('\u{1F48E}',
                            style: TextStyle(fontSize: 22)))
                    : Image.network(
                        subscription.image!,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const Center(
                          child: Text('\u{1F48E}',
                              style: TextStyle(fontSize: 22)),
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
                        style:
                            const TextStyle(fontSize: 12, color: Brand.mutedForeground),
                      ),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
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
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Divider(height: 1),
          ),
          _row('Paid', rupees(subscription.price)),
          _row('Added to wallet', rupees(subscription.walletCredit)),
          if ((subscription.paymentId ?? '').isNotEmpty)
            _row('Payment id', subscription.paymentId!),
        ],
      ),
    );
  }

  Widget _row(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(
          children: [
            Expanded(
              child: Text(label,
                  style: const TextStyle(fontSize: 13.5, color: Brand.gray600)),
            ),
            Text(
              value,
              style: const TextStyle(
                  fontSize: 13.5, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      );
}
