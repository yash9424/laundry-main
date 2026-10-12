import 'package:flutter/material.dart';

import '../models/catalogue.dart';
import '../services/api.dart';
import '../services/payments.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/common.dart';
import '../widgets/remote_image.dart';

/// `pages/Subscriptions.tsx` -- the wallet top-up plans.
///
/// A hero band, a sideways strip of every plan, and the selected one opened out
/// underneath with its picture, what it is worth and what it buys. Picking a
/// card only changes the selection; the Recharge button underneath is what
/// starts the payment.
class SubscriptionsScreen extends StatefulWidget {
  const SubscriptionsScreen({super.key});

  @override
  State<SubscriptionsScreen> createState() => _SubscriptionsScreenState();
}

class _SubscriptionsScreenState extends State<SubscriptionsScreen> {
  List<TopupPlan> _plans = [];
  bool _loading = true;
  String? _selected;
  String? _buying;

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
        if (_plans.isNotEmpty) _selected = _plans.first.id;
      }
      _loading = false;
    });
  }

  /// `linear-gradient(135deg, #452D9B 0%, #07C8D0 100%)` -- the brand pair on
  /// the diagonal, which is what this screen paints its hero and its image
  /// placeholders with. (Brand.deepGradient is the darker three-stop one the
  /// home screen's plan cards use -- not this.)
  static const _diagonal = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Brand.purple, Brand.cyan],
  );

  TopupPlan? get _selectedPlan {
    for (final plan in _plans) {
      if (plan.id == _selected) return plan;
    }
    return null;
  }

  Future<void> _buy(TopupPlan plan) async {
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);

    final customerId = Store.customerId;
    if (customerId == null) {
      navigator.pushNamed('/login');
      return;
    }

    setState(() => _buying = plan.id);
    final payment = await Payments.charge(
      amount: plan.price,
      description: '${plan.name} Plan',
      receipt: 'sub_${DateTime.now().millisecondsSinceEpoch}',
    );
    if (!mounted) return;

    if (payment.cancelled) {
      setState(() => _buying = null);
      return;
    }
    if (!payment.paid) {
      setState(() => _buying = null);
      showToast(
        context,
        payment.message ?? 'Payment error. Contact support.',
        error: true,
      );
      return;
    }

    final created = await Api.createSubscription({
      'customerId': customerId,
      'planId': plan.id,
      'razorpayOrderId': payment.orderId,
      'razorpayPaymentId': payment.paymentId,
      'status': 'active',
    });
    if (!mounted) return;
    setState(() => _buying = null);

    if (!created.ok) {
      // The money left their account, so this must not look like a quiet
      // failure -- it needs a person to fix it.
      showToast(
        context,
        'Payment went through but the wallet did not update. Please contact '
        'support with payment id ${payment.paymentId}.',
        error: true,
      );
      return;
    }

    messenger.clearSnackBars();
    messenger.showSnackBar(
      SnackBar(
        content: Text('✅ ${rupees(plan.walletCredit)} added to your wallet!'),
        backgroundColor: Brand.green600,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 4),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
    navigator.pushReplacementNamed('/my-subscription');
  }

  @override
  Widget build(BuildContext context) {
    final selected = _selectedPlan;

    return Scaffold(
      backgroundColor: Brand.gray50,
      appBar: const AppHeader(title: 'Wallet Plans', gradient: true),
      bottomNavigationBar: const AppBottomNav(current: '/subscriptions'),
      body: ListView(
        // `padding: 1.25rem 1.25rem 2rem`
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
        children: [
          _hero(),
          const SizedBox(height: 24), // margin-bottom 1.5rem
          if (_loading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 64), // 4rem
              child: Center(
                child: SizedBox(
                  height: 36,
                  width: 36,
                  child: CircularProgressIndicator(
                    strokeWidth: 3,
                    color: Brand.purple,
                  ),
                ),
              ),
            )
          else if (_plans.isEmpty)
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 64, 16, 64),
              child: Column(
                children: [
                  Text('\u{1F4B3}', style: TextStyle(fontSize: 48)), // 3rem
                  SizedBox(height: 12), // 0.75rem
                  Text(
                    'No plans available right now.',
                    style: TextStyle(color: Color(0xFF94A3B8)),
                  ),
                ],
              ),
            )
          else ...[
            _strip(),
            if (selected != null) _detail(selected),
            _myPlansButton(),
          ],
        ],
      ),
    );
  }

  /// The band at the top: a 135-degree brand gradient with two very faint
  /// circles bleeding off the right edge.
  Widget _hero() => ClipRRect(
    borderRadius: BorderRadius.circular(20),
    child: Container(
      decoration: const BoxDecoration(gradient: _diagonal),
      child: Stack(
        children: [
          Positioned(top: -20, right: -20, child: _circle(100, 0.08)),
          Positioned(bottom: -30, right: 40, child: _circle(70, 0.06)),
          Padding(
            // 1.25rem 1.5rem
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'WALLET TOP-UP',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.8),
                    fontSize: 12.5, // 0.78rem
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 5), // 0.3rem
                const Text(
                  'Pay Less, Get More',
                  style: TextStyle(
                    fontFamily: 'Montserrat',
                    color: Colors.white,
                    fontSize: 21, // 1.3rem
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4), // 0.25rem
                Text(
                  'Recharge & save on every order',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.7),
                    fontSize: 13, // 0.82rem
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );

  Widget _circle(double size, double opacity) => Container(
    height: size,
    width: size,
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: opacity),
      shape: BoxShape.circle,
    ),
  );

  /// Every plan, side by side, so nothing the admin uploads stays hidden.
  Widget _strip() => SizedBox(
    height: 148,
    child: ListView.separated(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.only(bottom: 12), // padding-bottom 0.75rem
      itemCount: _plans.length,
      separatorBuilder: (_, __) => const SizedBox(width: 12), // gap
      itemBuilder: (context, i) => _stripCard(_plans[i]),
    ),
  );

  Widget _stripCard(TopupPlan plan) {
    final active = plan.id == _selected;
    final bonus = plan.walletCredit - plan.price;

    return GestureDetector(
      onTap: () => setState(() => _selected = plan.id),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 132,
        transform: Matrix4.translationValues(0, active ? -2 : 0, 0),
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: active ? Brand.purple : const Color(0xFFE8E8EF),
            width: 2,
          ),
          boxShadow: [
            BoxShadow(
              color: active
                  ? Brand.purple.withValues(alpha: 0.22)
                  : const Color(0x0D000000),
              blurRadius: active ? 20 : 6,
              offset: Offset(0, active ? 8 : 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              height: 74,
              width: double.infinity,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (plan.image == null)
                    const DecoratedBox(
                      decoration: BoxDecoration(gradient: _diagonal),
                      child: Center(
                        child: Text(
                          '\u{1F4B3}',
                          style: TextStyle(fontSize: 26),
                        ), // 1.6rem
                      ),
                    )
                  else
                    RemoteImage(
                      url: plan.image,
                      decodeWidth: 132,
                      fallback: const DecoratedBox(
                        decoration: BoxDecoration(gradient: _diagonal),
                        child: Center(
                          child: Text(
                            '\u{1F4B3}',
                            style: TextStyle(fontSize: 26),
                          ),
                        ),
                      ),
                    ),
                  if (bonus > 0)
                    Positioned(
                      top: 6,
                      left: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 1,
                        ),
                        decoration: BoxDecoration(
                          color: Brand.green600,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          '+${rupees(bonus)}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10, // 0.62rem
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            Padding(
              // 0.5rem 0.6rem 0.6rem
              padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    plan.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontFamily: 'Montserrat',
                      fontSize: 13.5, // 0.85rem
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF1E293B),
                    ),
                  ),
                  const SizedBox(height: 2), // 0.15rem
                  Text.rich(
                    TextSpan(
                      style: const TextStyle(
                        fontSize: 11.5, // 0.72rem
                        color: Color(0xFF64748B),
                      ),
                      children: [
                        TextSpan(text: '${rupees(plan.price)} → '),
                        TextSpan(
                          text: rupees(plan.walletCredit),
                          style: const TextStyle(
                            color: Brand.purple,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// The selected plan, opened out.
  Widget _detail(TopupPlan plan) {
    final bonus = plan.walletCredit - plan.price;
    final busy = _buying == plan.id;

    return Container(
      margin: const EdgeInsets.only(bottom: 20), // 1.25rem
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Brand.purple.withValues(alpha: 0.08)),
        boxShadow: [
          BoxShadow(
            color: Brand.purple.withValues(alpha: 0.12),
            blurRadius: 32,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            height: 170,
            child: plan.image == null
                ? _detailBanner(plan)
                : RemoteImage(
                    url: plan.image,
                    height: 170,
                    decodeWidth: MediaQuery.sizeOf(context).width,
                    fallback: _detailBanner(plan),
                  ),
          ),
          Padding(
            padding: const EdgeInsets.all(20), // 1.25rem
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _valuePill(plan, bonus),
                const SizedBox(height: 18), // 1.1rem
                for (final benefit in plan.benefits)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8), // 0.5rem
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '✓',
                          style: TextStyle(
                            color: Brand.cyan,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(width: 8), // gap 0.5rem
                        Expanded(
                          child: Text(
                            benefit,
                            style: const TextStyle(
                              fontSize: 13.5, // 0.85rem
                              color: Color(0xFF475569),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: 12), // list margin-bottom 1.25rem
                GradientButton(
                  label: busy
                      ? 'Processing...'
                      : 'Recharge ${rupees(plan.price)} →',
                  busy: busy,
                  height: 50, // padding 0.9rem around a 1rem line
                  radius: 14,
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  disabledLook: DisabledLook.flatGrey,
                  onPressed: busy ? null : () => _buy(plan),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _detailBanner(TopupPlan plan) => DecoratedBox(
    decoration: const BoxDecoration(gradient: _diagonal),
    child: Stack(
      children: [
        Positioned(
          top: 12,
          right: 12,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(50),
            ),
            child: const Text(
              'BEST VALUE',
              style: TextStyle(
                color: Colors.white,
                fontSize: 11.5, // 0.72rem
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
        Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('\u{1F4B3}', style: TextStyle(fontSize: 48)),
              const SizedBox(height: 6), // 0.4rem
              Text(
                plan.name,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ],
    ),
  );

  Widget _valuePill(TopupPlan plan, num bonus) => Container(
    // 0.875rem 1rem
    padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
    decoration: BoxDecoration(
      gradient: const LinearGradient(
        colors: [Color(0xFFF5F3FF), Color(0xFFECFEFF)],
      ),
      border: Border.all(color: Brand.purple.withValues(alpha: 0.12)),
      borderRadius: BorderRadius.circular(14),
    ),
    child: Column(
      children: [
        const Text(
          'YOU PAY → YOU GET',
          style: TextStyle(
            color: Color(0xFF94A3B8),
            fontSize: 11.5, // 0.72rem
            letterSpacing: 1,
          ),
        ),
        const SizedBox(height: 5), // 0.3rem
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              rupees(plan.price),
              style: const TextStyle(
                fontFamily: 'Montserrat',
                fontSize: 22, // 1.4rem
                fontWeight: FontWeight.w900,
                color: Color(0xFF1E293B),
              ),
            ),
            const Text(
              ' → ',
              style: TextStyle(
                fontFamily: 'Montserrat',
                fontSize: 22,
                fontWeight: FontWeight.w900,
                color: Color(0xFFCBD5E1),
              ),
            ),
            GradientText(
              rupees(plan.walletCredit),
              style: const TextStyle(
                fontFamily: 'Montserrat',
                fontSize: 22,
                fontWeight: FontWeight.w900,
              ),
            ),
          ],
        ),
        if (bonus > 0) ...[
          const SizedBox(height: 6), // 0.4rem
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
            decoration: BoxDecoration(
              color: const Color(0xFFDCFCE7),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              '+${rupees(bonus)} bonus free!',
              style: const TextStyle(
                color: Brand.green600,
                fontSize: 12, // 0.75rem
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ],
    ),
  );

  Widget _myPlansButton() => SizedBox(
    height: 46, // padding 0.75rem around a 0.9rem line
    child: OutlinedButton(
      onPressed: () => Navigator.of(context).pushNamed('/my-subscription'),
      style: OutlinedButton.styleFrom(
        backgroundColor: Colors.white,
        side: const BorderSide(color: Brand.purple, width: 2),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
      child: const Text(
        'View My Wallet Plans →',
        style: TextStyle(
          color: Brand.purple,
          fontWeight: FontWeight.w700,
          fontSize: 14.5, // 0.9rem
        ),
      ),
    ),
  );
}
