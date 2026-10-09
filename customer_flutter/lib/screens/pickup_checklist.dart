import 'package:flutter/material.dart';

import '../models/checkout.dart';
import '../theme/brand.dart';
import '../widgets/common.dart';
import '../widgets/pickup_checklist.dart';

/// Step one of checkout: what to have ready before the captain arrives.
///
/// This used to be half of a dialog stacked over the cart. A dialog has no
/// address of its own, so the hardware back button had nothing to go back to
/// and fell through to whatever the page behind it did -- which on the cart was
/// to close the app. As a screen it behaves like every other screen.
class PickupChecklistScreen extends StatelessWidget {
  const PickupChecklistScreen({super.key, required this.draft});

  final CheckoutDraft? draft;

  @override
  Widget build(BuildContext context) {
    final checkout = draft;

    // Reached directly, with nothing picked: there is nothing to confirm.
    if (checkout == null || checkout.isEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted) {
          Navigator.of(context).pushReplacementNamed('/cart');
        }
      });
      return const Scaffold(body: SizedBox.shrink());
    }

    final pieces = checkout.pieces;

    return Scaffold(
      backgroundColor: Brand.gray50,
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () {
            final navigator = Navigator.of(context);
            if (navigator.canPop()) {
              navigator.pop();
            } else {
              navigator.pushReplacementNamed('/cart');
            }
          },
        ),
        titleSpacing: 0,
        title: const Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Before your pickup',
              style: TextStyle(
                fontFamily: 'Montserrat',
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: Colors.black,
                height: 1.2,
              ),
            ),
            Text(
              'Step 1 of 2',
              style: TextStyle(fontSize: 11, color: Brand.mutedForeground),
            ),
          ],
        ),
        shape: const Border(bottom: BorderSide(color: Brand.border)),
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: const [
                    BoxShadow(
                        color: Color(0x0D000000),
                        blurRadius: 8,
                        offset: Offset(0, 2)),
                  ],
                ),
                // plain: this screen's header already carries the title, so the
                // widget should not print it a second time.
                child: const PickupChecklist(plain: true),
              ),
            ),
          ),
          SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: Brand.border)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          '$pieces garment${pieces == 1 ? '' : 's'}',
                          style: const TextStyle(
                              fontSize: 14, color: Brand.gray600),
                        ),
                      ),
                      Text(
                        rupees(checkout.itemsTotal),
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  GradientButton(
                    label: 'Next',
                    height: 50,
                    radius: 16,
                    onPressed: () => Navigator.of(context)
                        .pushNamed('/pickup-slot', arguments: checkout),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
