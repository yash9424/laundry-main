import 'dart:async';

import 'package:flutter/material.dart';

import '../models/catalogue.dart';
import '../services/api.dart';
import '../services/payments.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import 'common.dart';

/// The wallet top-up carousel on the home screen.
///
/// Everything used to sit on one row -- picture, name, price, benefits and the
/// button -- which on a phone left the text about 200px to live in. It is
/// stacked, so each part has its width.
class PlanCarousel extends StatefulWidget {
  const PlanCarousel({super.key, required this.plans, required this.onViewAll});

  final List<TopupPlan> plans;
  final VoidCallback onViewAll;

  @override
  State<PlanCarousel> createState() => _PlanCarouselState();
}

class _PlanCarouselState extends State<PlanCarousel> {
  final _controller = PageController();
  Timer? _auto;
  Timer? _resume;
  int _index = 0;

  @override
  void initState() {
    super.initState();
    _start();
  }

  @override
  void didUpdateWidget(covariant PlanCarousel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.plans.length != widget.plans.length) _start();
  }

  @override
  void dispose() {
    _auto?.cancel();
    _resume?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _start() {
    _auto?.cancel();
    if (widget.plans.length <= 1) return;
    _auto = Timer.periodic(const Duration(milliseconds: 3500), (_) {
      if (!mounted || !_controller.hasClients) return;
      _controller.animateToPage(
        (_index + 1) % widget.plans.length,
        duration: const Duration(milliseconds: 600),
        curve: Curves.easeInOut,
      );
    });
  }

  void _pause() {
    _auto?.cancel();
    _resume?.cancel();
    _resume = Timer(const Duration(seconds: 5), _start);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: SizedBox(
            height: 262,
            child: Listener(
              onPointerDown: (_) => _pause(),
              child: PageView.builder(
                controller: _controller,
                itemCount: widget.plans.length,
                onPageChanged: (i) => setState(() => _index = i),
                itemBuilder: (_, i) => _PlanSlide(
                  plan: widget.plans[i],
                  onTap: () => showPlanSheet(context, widget.plans[i]),
                ),
              ),
            ),
          ),
        ),
        if (widget.plans.length > 1)
          Padding(
            padding: const EdgeInsets.only(top: 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (var i = 0; i < widget.plans.length; i++)
                  GestureDetector(
                    onTap: () {
                      _pause();
                      _controller.animateToPage(
                        i,
                        duration: const Duration(milliseconds: 400),
                        curve: Curves.easeInOut,
                      );
                    },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      height: 8,
                      width: i == _index ? 20 : 8,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(4),
                        color: i == _index ? Brand.purple : const Color(0xFFD1D5DB),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        // Always available, including after a plan has been bought.
        Padding(
          padding: const EdgeInsets.only(top: 12),
          child: SizedBox(
            height: 46,
            width: double.infinity,
            child: OutlinedButton(
              onPressed: widget.onViewAll,
              style: OutlinedButton.styleFrom(
                backgroundColor: Colors.white,
                side: const BorderSide(color: Brand.purple, width: 1.5),
                shape:
                    RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: const Text(
                'View All Plans',
                style: TextStyle(
                  color: Brand.purple,
                  fontWeight: FontWeight.w600,
                  fontSize: 15,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _PlanSlide extends StatelessWidget {
  const _PlanSlide({required this.plan, required this.onTap});

  final TopupPlan plan;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    // Anything that just repeats the wallet figure above is dropped rather than
    // printed twice.
    final points = plan.benefits
        .where((b) => !b.contains(plan.walletCredit.toString()))
        .take(2)
        .toList();

    return DecoratedBox(
      decoration: const BoxDecoration(gradient: Brand.deepGradient),
      child: Stack(
        children: [
          Positioned(
            top: -28,
            right: -28,
            child: Container(
              height: 120,
              width: 120,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Brand.cyan.withValues(alpha: 0.15),
              ),
            ),
          ),
          Positioned(
            bottom: -24,
            left: -18,
            child: Container(
              height: 95,
              width: 95,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Brand.purple.withValues(alpha: 0.3),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      height: 54,
                      width: 54,
                      clipBehavior: Clip.antiAlias,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        color: Colors.white10,
                        border: Border.all(color: Colors.white24, width: 1.5),
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
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        plan.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontFamily: 'Montserrat',
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          height: 1.2,
                        ),
                      ),
                    ),
                    if (plan.bonusPercent > 0)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFFF59E0B), Color(0xFFEF4444)],
                          ),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          '+${plan.bonusPercent}%',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 14),
                // The whole offer in one line, with room to be read.
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('YOU PAY', style: _capStyle),
                        Text(
                          rupees(plan.price),
                          style: const TextStyle(
                            color: Color(0xFFFDE68A),
                            fontWeight: FontWeight.w700,
                            fontSize: 18,
                            height: 1.1,
                          ),
                        ),
                      ],
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 10),
                      child: Text('→',
                          style: TextStyle(color: Colors.white38, fontSize: 18)),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('IN YOUR WALLET', style: _capStyle),
                        Text(
                          rupees(plan.walletCredit),
                          style: const TextStyle(
                            color: Color(0xFF6EE7B7),
                            fontWeight: FontWeight.w800,
                            fontSize: 23,
                            height: 1.1,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                if (plan.walletCredit > plan.price)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      'That is ${rupees(plan.walletCredit - plan.price)} extra to spend.',
                      style: const TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                  ),
                const SizedBox(height: 10),
                for (final benefit in points)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('✓',
                            style: TextStyle(
                              color: Color(0xFF6EE7B7),
                              fontWeight: FontWeight.w800,
                              fontSize: 12,
                            )),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            benefit,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 12.5,
                              height: 1.4,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                const Spacer(),
                GradientButton(
                  label: 'Get this plan →',
                  height: 44,
                  radius: 14,
                  fontSize: 14.5,
                  onPressed: onTap,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static const _capStyle = TextStyle(
    color: Colors.white54,
    fontSize: 10.5,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.5,
  );
}

/// The plan detail sheet, and the purchase itself.
Future<void> showPlanSheet(BuildContext context, TopupPlan plan) async {
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
    ),
    builder: (sheetContext) => _PlanSheet(plan: plan),
  );
}

class _PlanSheet extends StatefulWidget {
  const _PlanSheet({required this.plan});

  final TopupPlan plan;

  @override
  State<_PlanSheet> createState() => _PlanSheetState();
}

class _PlanSheetState extends State<_PlanSheet> {
  bool _buying = false;

  Future<void> _buy() async {
    // Held before anything pops: once this sheet closes its own context can no
    // longer find a navigator or a messenger.
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);

    final customerId = Store.customerId;
    if (customerId == null) {
      navigator.pop();
      navigator.pushNamed('/login');
      return;
    }

    setState(() => _buying = true);
    final plan = widget.plan;
    final payment = await Payments.charge(
      amount: plan.price,
      description: '${plan.name} Plan',
      receipt: 'sub_${DateTime.now().millisecondsSinceEpoch}',
    );

    if (!mounted) return;

    if (payment.cancelled) {
      setState(() => _buying = false);
      return;
    }
    if (!payment.paid) {
      setState(() => _buying = false);
      showToast(context, payment.message ?? 'Payment failed. Contact support.',
          error: true);
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
    setState(() => _buying = false);

    if (!created.ok) {
      // The money left their account, so this must not look like a quiet
      // failure -- it needs a person to fix it.
      showToast(
        context,
        'Payment went through but the wallet did not update. Please contact support with payment id ${payment.paymentId}.',
        error: true,
      );
      return;
    }

    navigator.pop();
    messenger.clearSnackBars();
    messenger.showSnackBar(SnackBar(
      content: Text('✅ ${rupees(plan.walletCredit)} added to your wallet!'),
      backgroundColor: Brand.green600,
      behavior: SnackBarBehavior.floating,
      duration: const Duration(seconds: 4),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final plan = widget.plan;
    return SafeArea(
      top: false,
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (plan.image != null)
              Image.network(
                plan.image!,
                height: 180,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const _PlanSheetBanner(),
              )
            else
              const _PlanSheetBanner(),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          plan.name,
                          style: const TextStyle(
                            fontFamily: 'Montserrat',
                            fontSize: 21,
                            fontWeight: FontWeight.w800,
                            color: Brand.foreground,
                          ),
                        ),
                      ),
                      if (plan.bonusPercent > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFFF59E0B), Color(0xFFEF4444)],
                            ),
                            borderRadius: BorderRadius.circular(7),
                          ),
                          child: Text(
                            '+${plan.bonusPercent}% BONUS',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    decoration: BoxDecoration(
                      gradient: Brand.gradient,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Column(
                          children: [
                            const Text('YOU PAY',
                                style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w600,
                                )),
                            Text(
                              rupees(plan.price),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 24,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ],
                        ),
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 14),
                          child: Text('→',
                              style: TextStyle(
                                  color: Colors.white54, fontSize: 24)),
                        ),
                        Column(
                          children: [
                            const Text('WALLET GETS',
                                style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w600,
                                )),
                            Text(
                              rupees(plan.walletCredit),
                              style: const TextStyle(
                                color: Color(0xFF6EE7B7),
                                fontSize: 24,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  if (plan.benefits.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    for (final benefit in plan.benefits)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 7),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('✓',
                                style: TextStyle(
                                  color: Brand.cyan,
                                  fontWeight: FontWeight.w900,
                                )),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                benefit,
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: Brand.gray600,
                                  height: 1.45,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                  const SizedBox(height: 18),
                  GradientButton(
                    label: _buying
                        ? 'Processing...'
                        : 'Buy Now — ${rupees(plan.price)}',
                    busy: _buying,
                    height: 52,
                    onPressed: _buying ? null : _buy,
                  ),
                  const SizedBox(height: 6),
                  TextButton(
                    onPressed: _buying ? null : () => Navigator.of(context).pop(),
                    child: const Text('Cancel',
                        style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PlanSheetBanner extends StatelessWidget {
  const _PlanSheetBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 140,
      decoration: const BoxDecoration(gradient: Brand.deepGradient),
      child: const Center(
        child: Text('\u{1F48E}', style: TextStyle(fontSize: 52)),
      ),
    );
  }
}
