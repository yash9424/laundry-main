import 'package:flutter/material.dart';

import '../services/api.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/common.dart';

class RateOrderScreen extends StatefulWidget {
  const RateOrderScreen({super.key, required this.orderId});

  final String orderId;

  @override
  State<RateOrderScreen> createState() => _RateOrderScreenState();
}

class _RateOrderScreenState extends State<RateOrderScreen> {
  static const _labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  final _feedback = TextEditingController();
  int _rating = 0;
  bool _submitting = false;

  /// The order's own `_id`, which is what the review route wants.
  String? _documentId;
  String _itemsText = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _feedback.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (widget.orderId.isEmpty) return;
    final result = await Api.order(widget.orderId);
    if (!mounted || !result.ok) return;
    final order = result.map;
    final items = order['items'];
    setState(() {
      _documentId = (order['_id'] ?? '').toString();
      _itemsText = (items is List)
          ? items
              .whereType<Map>()
              .map((i) => '${i['quantity']} ${i['name']}')
              .join(', ')
          : '';
    });
  }

  Future<void> _submit() async {
    if (_rating == 0 || _submitting) return;
    final customerId = Store.customerId;
    if (customerId == null) {
      showToast(context, 'Please login to leave a review', error: true);
      return;
    }

    setState(() => _submitting = true);
    final result = await Api.reviewOrder(
      _documentId?.isNotEmpty == true ? _documentId! : widget.orderId,
      rating: _rating,
      comment: _feedback.text.trim().isEmpty
          ? 'No comment provided'
          : _feedback.text.trim(),
      customerId: customerId,
    );
    if (!mounted) return;
    setState(() => _submitting = false);

    if (result.ok) {
      showToast(context, 'Thank you for your feedback!');
      await Future<void>.delayed(const Duration(milliseconds: 900));
      if (mounted) Navigator.of(context).pop();
    } else {
      showToast(context, result.error ?? 'Failed to submit review', error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: const AppHeader(title: 'Rate Your Order'),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 28, 20, 32),
          child: Column(
            children: [
              Container(
                height: 76,
                width: 76,
                decoration: const BoxDecoration(
                  gradient: Brand.gradient,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.dry_cleaning,
                    size: 38, color: Colors.white),
              ),
              const SizedBox(height: 18),
              Text(
                widget.orderId.isEmpty
                    ? 'How was your order?'
                    : 'How was order #${widget.orderId}?',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontFamily: 'Montserrat',
                  fontSize: 21,
                  fontWeight: FontWeight.w700,
                ),
              ),
              if (_itemsText.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  _itemsText,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 13, color: Brand.mutedForeground),
                ),
              ],
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (var star = 1; star <= 5; star++)
                    GestureDetector(
                      onTap: () => setState(() => _rating = star),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 5),
                        child: Icon(
                          star <= _rating ? Icons.star : Icons.star_border,
                          size: 42,
                          color: star <= _rating
                              ? Brand.purple
                              : const Color(0xFFD1D5DB),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 10),
              SizedBox(
                height: 26,
                child: _rating > 0
                    ? GradientText(
                        _labels[_rating],
                        style: const TextStyle(
                          fontFamily: 'Montserrat',
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                        ),
                      )
                    : const SizedBox.shrink(),
              ),
              const SizedBox(height: 22),
              TextField(
                controller: _feedback,
                maxLines: 4,
                maxLength: 300,
                decoration: InputDecoration(
                  hintText: 'Tell us more (optional)...',
                  hintStyle: const TextStyle(fontSize: 14, color: Brand.mutedForeground),
                  counterText: '',
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide:
                        const BorderSide(color: Color(0xFFD1D5DB), width: 2),
                  ),
                ),
              ),
              const SizedBox(height: 22),
              GradientButton(
                label: _submitting ? 'Submitting...' : 'Submit Review',
                busy: _submitting,
                height: 50,
                onPressed: _rating > 0 && !_submitting ? _submit : null,
              ),
              const SizedBox(height: 10),
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Maybe later',
                    style: TextStyle(color: Brand.mutedForeground)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
