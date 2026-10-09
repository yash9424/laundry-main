import 'package:flutter/material.dart';

import '../models/catalogue.dart';
import '../services/api.dart';
import '../theme/brand.dart';
import '../widgets/common.dart';
import '../widgets/plan_card.dart';

/// Every wallet top-up plan, listed. Buying one goes through the same sheet the
/// home screen uses, so the purchase flow exists in one place only.
class SubscriptionsScreen extends StatefulWidget {
  const SubscriptionsScreen({super.key});

  @override
  State<SubscriptionsScreen> createState() => _SubscriptionsScreenState();
}

class _SubscriptionsScreenState extends State<SubscriptionsScreen> {
  List<TopupPlan> _plans = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final result = await Api.subscriptionPlans();
    if (!mounted) return;
    setState(() {
      if (result.ok) {
        _plans = result.list
            .whereType<Map>()
            .map((m) => TopupPlan.fromJson(Map<String, dynamic>.from(m)))
            .where((p) => p.isActive)
            .toList();
      }
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Brand.gray50,
      appBar: const AppHeader(title: 'Wallet Plans', gradient: true),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Brand.purple))
          : _plans.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text('\u{1F48E}', style: TextStyle(fontSize: 48)),
                        const SizedBox(height: 14),
                        const Text(
                          'No plans available right now',
                          style: TextStyle(
                            fontFamily: 'Montserrat',
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Check back soon for wallet top-up offers.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Brand.mutedForeground),
                        ),
                        const SizedBox(height: 20),
                        SizedBox(
                          width: 200,
                          child: GradientButton(
                            label: 'Back',
                            height: 46,
                            onPressed: () => Navigator.of(context).pop(),
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
                      const Text(
                        'Top up your wallet and spend it on any order.',
                        style: TextStyle(
                            fontSize: 14, color: Brand.gray600, height: 1.5),
                      ),
                      const SizedBox(height: 16),
                      for (final plan in _plans)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 14),
                          child: _planRow(plan),
                        ),
                      const SizedBox(height: 6),
                      SizedBox(
                        height: 48,
                        child: OutlinedButton(
                          onPressed: () => Navigator.of(context)
                              .pushNamed('/my-subscription'),
                          style: OutlinedButton.styleFrom(
                            backgroundColor: Colors.white,
                            side: const BorderSide(
                                color: Brand.purple, width: 1.5),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16)),
                          ),
                          child: const Text(
                            'View My Wallet Plans',
                            style: TextStyle(
                              color: Brand.purple,
                              fontWeight: FontWeight.w600,
                              fontSize: 15,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }

  Widget _planRow(TopupPlan plan) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => showPlanSheet(context, plan),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: const [
              BoxShadow(
                  color: Color(0x14000000),
                  blurRadius: 12,
                  offset: Offset(0, 4)),
            ],
          ),
          child: Row(
            children: [
              Container(
                height: 56,
                width: 56,
                clipBehavior: Clip.antiAlias,
                decoration: BoxDecoration(
                  gradient: plan.image == null ? Brand.deepGradient : null,
                  color: plan.image == null ? null : const Color(0xFFF3F4F6),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: plan.image == null
                    ? const Center(
                        child: Text('\u{1F48E}',
                            style: TextStyle(fontSize: 24)))
                    : Image.network(
                        plan.image!,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const Center(
                          child: Text('\u{1F48E}',
                              style: TextStyle(fontSize: 24)),
                        ),
                      ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            plan.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontFamily: 'Montserrat',
                              fontSize: 15.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        if (plan.bonusPercent > 0)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(colors: [
                                Color(0xFFF59E0B),
                                Color(0xFFEF4444),
                              ]),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              '+${plan.bonusPercent}%',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text(
                          rupees(plan.price),
                          style: const TextStyle(
                              fontSize: 14, color: Brand.gray600),
                        ),
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 6),
                          child: Text('→',
                              style: TextStyle(color: Brand.mutedForeground)),
                        ),
                        GradientText(
                          rupees(plan.walletCredit),
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            fontFamily: 'Montserrat',
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: Brand.mutedForeground),
            ],
          ),
        ),
      ),
    );
  }
}
