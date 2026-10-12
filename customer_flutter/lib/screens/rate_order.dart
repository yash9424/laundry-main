import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../services/api.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/common.dart';
import '../widgets/lucide.dart';

class RateOrderScreen extends StatefulWidget {
  const RateOrderScreen({super.key, required this.orderId});

  final String orderId;

  @override
  State<RateOrderScreen> createState() => _RateOrderScreenState();
}

class _RateOrderScreenState extends State<RateOrderScreen> {
  static const _labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  /// `toLocaleDateString('en-GB', { day, month, hour, minute })`.
  static final _placed = DateFormat('dd MMM, HH:mm');

  final _feedback = TextEditingController();
  int _rating = 0;
  bool _submitting = false;
  bool _loading = true;

  /// The order's own `_id`, which is what the review route wants.
  String? _documentId;
  String _displayId = '';
  String _itemsText = '';
  String _statusText = '';
  String _placedText = '';
  num _amount = 0;

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
    if (widget.orderId.isEmpty) {
      setState(() => _loading = false);
      return;
    }
    final result = await Api.order(widget.orderId);
    if (!mounted) return;
    if (!result.ok) {
      setState(() => _loading = false);
      return;
    }

    final order = result.map;
    final items = order['items'];
    final status = (order['status'] ?? '').toString().replaceAll('_', ' ');
    final createdAt = DateTime.tryParse(
      (order['createdAt'] ?? '').toString(),
    )?.toLocal();

    setState(() {
      _loading = false;
      _documentId = (order['_id'] ?? '').toString();
      _displayId = (order['orderId'] ?? widget.orderId).toString();
      _itemsText = (items is List && items.isNotEmpty)
          ? items
                .whereType<Map>()
                .map((i) => '${i['quantity']} ${i['name']}')
                .join(', ')
          : 'No items';
      _statusText = status.isEmpty
          ? ''
          : status[0].toUpperCase() + status.substring(1);
      _placedText = createdAt == null ? '' : _placed.format(createdAt);
      _amount = num.tryParse((order['totalAmount'] ?? 0).toString()) ?? 0;
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
      showToast(
        context,
        result.error ?? 'Failed to submit review',
        error: true,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Brand.gray50,
      appBar: const AppHeader(title: 'Rate Your Order'),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 24, 16, 80), // px-4 py-6 pb-20
          child: _loading
              ? const Padding(
                  padding: EdgeInsets.symmetric(vertical: 32),
                  child: Center(
                    child: Text(
                      'Loading order details...',
                      style: TextStyle(color: Brand.mutedForeground),
                    ),
                  ),
                )
              : Column(
                  children: [
                    _orderCard(),
                    const SizedBox(height: 24), // space-y-6
                    _ratingCard(),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _orderCard() => _card(
    padding: const EdgeInsets.all(16), // p-4
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          height: 48, // w-12 h-12
          width: 48,
          decoration: BoxDecoration(
            gradient: Brand.gradient,
            borderRadius: BorderRadius.circular(Brand.rLg),
          ),
          child: Center(child: Lucide.shirt(size: 24, color: Colors.white)),
        ),
        const SizedBox(width: 16), // gap-4
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Order #$_displayId',
                style: const TextStyle(
                  fontFamily: 'Montserrat',
                  fontSize: 18, // text-lg
                  fontWeight: FontWeight.w700,
                  color: Colors.black,
                ),
              ),
              const SizedBox(height: 4), // mb-1
              Text(
                _statusText.isEmpty ? _itemsText : '$_itemsText - $_statusText',
                style: const TextStyle(
                  fontSize: 14, // text-sm
                  color: Color(0xFF4B5563), // gray-600
                ),
              ),
              const SizedBox(height: 4),
              if (_placedText.isNotEmpty)
                Text(
                  'on $_placedText',
                  style: const TextStyle(
                    fontSize: 12, // text-xs
                    color: Color(0xFF6B7280), // gray-500
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        GradientText(
          rupees(_amount),
          style: const TextStyle(
            fontFamily: 'Montserrat',
            fontSize: 18, // text-lg
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    ),
  );

  Widget _ratingCard() => _card(
    padding: const EdgeInsets.all(24), // p-6
    child: Column(
      children: [
        const Text(
          'How was your experience?',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontFamily: 'Montserrat',
            fontSize: 18, // text-lg
            fontWeight: FontWeight.w700,
            color: Colors.black,
          ),
        ),
        const SizedBox(height: 24), // mb-6
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            for (var star = 1; star <= 5; star++)
              GestureDetector(
                onTap: () => setState(() => _rating = star),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4), // gap-2
                  child: Icon(
                    star <= _rating ? Icons.star : Icons.star_border,
                    size: 32, // w-8 h-8
                    color: star <= _rating
                        ? Brand.purple
                        : const Color(0xFFD1D5DB), // gray-300
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 16), // mb-4
        if (_rating > 0) ...[
          Text(
            _labels[_rating].toUpperCase(),
            style: const TextStyle(
              fontSize: 14, // text-sm
              fontWeight: FontWeight.w600,
              letterSpacing: 0.4, // tracking-wide
              color: Color(0xFF4B5563), // gray-600
            ),
          ),
          const SizedBox(height: 24), // mb-6
        ],
        TextField(
          controller: _feedback,
          maxLines: null,
          minLines: 3,
          maxLength: 500,
          style: const TextStyle(fontSize: 14), // text-sm
          decoration: InputDecoration(
            hintText: 'Write your feedback (optional)...',
            hintStyle: const TextStyle(
              fontSize: 14,
              color: Brand.mutedForeground,
            ),
            counterText: '',
            filled: true,
            fillColor: Colors.white,
            contentPadding: const EdgeInsets.all(16), // p-4
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(Brand.r2xl),
              borderSide: const BorderSide(color: Color(0xFFE0D4F7), width: 2),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(Brand.r2xl),
              borderSide: const BorderSide(color: Brand.purple, width: 2),
            ),
          ),
        ),
        const SizedBox(height: 24), // mb-6
        GradientButton(
          label: 'Submit Rating',
          busy: _submitting,
          height: 48, // h-12
          radius: Brand.r2xl,
          fontSize: 16, // text-base
          // Disabled is a flat gray-300 here, not the usual faded gradient.
          disabledLook: DisabledLook.flatGrey300,
          onPressed: _rating > 0 && !_submitting ? _submit : null,
        ),
        const SizedBox(height: 12), // space-y-3
        SizedBox(
          height: 40, // h-10
          width: double.infinity,
          child: TextButton(
            onPressed: () => Navigator.of(context).pop(),
            style: TextButton.styleFrom(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(Brand.r2xl),
              ),
            ),
            child: const Text(
              'Skip',
              style: TextStyle(
                fontSize: 16, // text-base
                fontWeight: FontWeight.w600,
                color: Brand.purple,
              ),
            ),
          ),
        ),
      ],
    ),
  );

  Widget _card({required Widget child, required EdgeInsets padding}) =>
      Container(
        width: double.infinity,
        padding: padding,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(Brand.r2xl),
          boxShadow: const [
            BoxShadow(
              color: Color(0x1A000000),
              blurRadius: 15,
              offset: Offset(0, 10),
            ),
          ],
        ),
        child: child,
      );
}
