import 'package:flutter/material.dart';

import '../models/order_charges.dart';
import '../services/api.dart';
import '../services/cart.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/common.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  /// Which lines are ticked. Everything starts ticked, as the web screen did.
  final Set<String> _selected = {};

  String _category = 'All';
  num _minOrderPrice = 500;
  num _expressFee = 0;
  bool _checklistEnabled = true;
  bool _expressChosen = false;

  @override
  void initState() {
    super.initState();
    Cart.reload();
    _selected.addAll(Cart.lines.map((l) => l.id));
    _expressChosen = Store.getString(Store.kDeliveryType) == 'express';
    _load();
  }

  Future<void> _load() async {
    final results = await Future.wait([Api.orderCharges(), Api.walletSettings()]);
    if (!mounted) return;
    setState(() {
      if (results[0].ok) {
        final charges = OrderChargesConfig.fromJson(results[0].map);
        _checklistEnabled = charges.checklistEnabled;
        if (!charges.expressEnabled) {
          Store.setString(Store.kDeliveryType, 'standard');
          _expressChosen = false;
          _expressFee = 0;
        } else {
          _expressFee = charges.expressPrice;
        }
      }
      if (results[1].ok) {
        _minOrderPrice = WalletSettings.fromJson(results[1].map).minOrderPrice;
      }
    });
  }

  List<CartLine> get _ticked =>
      Cart.lines.where((l) => _selected.contains(l.id)).toList();

  num get _tickedTotal => _ticked.fold<num>(0, (s, l) => s + l.lineTotal);

  int get _tickedCount => _ticked.fold(0, (s, l) => s + l.quantity);

  bool get _belowMinimum => _tickedTotal < _minOrderPrice;

  /// The express fee only joins the total once the minimum is met, which is how
  /// the summary on this screen reads.
  num get _orderTotal =>
      _belowMinimum ? _tickedTotal : _tickedTotal + (_expressChosen ? _expressFee : 0);

  List<String> get _categories {
    final names = <String>{for (final line in Cart.lines) line.category};
    return ['All', ...names];
  }

  List<CartLine> get _visible => _category == 'All'
      ? Cart.lines
      : Cart.lines.where((l) => l.category == _category).toList();

  Future<void> _bump(CartLine line, bool up) async {
    await Cart.setQuantity(
      id: line.id,
      name: line.name,
      price: line.price,
      category: line.category,
      quantity: line.quantity + (up ? 1 : -1),
    );
    if (!mounted) return;
    if (Cart.quantityOf(line.id) == 0) _selected.remove(line.id);
    setState(() {});
  }

  Future<void> _remove(CartLine line) async {
    await Cart.setQuantity(
      id: line.id,
      name: line.name,
      price: line.price,
      category: line.category,
      quantity: 0,
    );
    if (!mounted) return;
    _selected.remove(line.id);
    setState(() {});
  }

  Future<void> _confirmClear() async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text(
          'Delete entire cart?',
          style: TextStyle(fontFamily: 'Montserrat', fontWeight: FontWeight.w700),
        ),
        content: const Text(
          'Are you sure you want to delete the entire cart? '
          'All the items you have added will be removed.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('No, keep it', style: TextStyle(color: Brand.mutedForeground)),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Yes, delete', style: TextStyle(color: Brand.destructive)),
          ),
        ],
      ),
    );
    if (yes != true) return;
    await Cart.clear();
    if (!mounted) return;
    setState(_selected.clear);
  }

  void _checkout() {
    if (_selected.isEmpty) {
      showToast(context, 'Please select at least one item to order', error: true);
      return;
    }
    if (_belowMinimum) {
      showToast(
        context,
        'Minimum order value is ${rupees(_minOrderPrice)}. Please add more items.',
        error: true,
      );
      return;
    }
    // Checkout is two screens of its own, so the back button has somewhere real
    // to go. With the checklist switched off there is nothing to show, so this
    // goes straight to the slot.
    Navigator.of(context).pushNamed(
      _checklistEnabled ? '/pickup-checklist' : '/pickup-slot',
      arguments: {
        'cartItems': _ticked,
        'totalAmount': _tickedTotal,
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final lines = Cart.lines;
    return Scaffold(
      backgroundColor: Brand.gray50,
        appBar: AppHeader(
          title: 'My Cart (${Cart.itemCount})',
          action: lines.isEmpty
              ? null
              : IconButton(
                  tooltip: 'Delete entire cart',
                  icon: const Icon(Icons.delete_outline,
                      size: 20, color: Brand.red500),
                  onPressed: _confirmClear,
                ),
        ),
      bottomNavigationBar: const AppBottomNav(current: '/cart'),
      body: lines.isEmpty ? _empty() : _filled(),
    );
  }

  Widget _empty() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              height: 96,
              width: 96,
              decoration: const BoxDecoration(
                color: Color(0xFFF3F4F6),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.shopping_cart_outlined,
                  size: 48, color: Brand.gray400), // w-12 h-12
            ),
            const SizedBox(height: 24),
            const Text(
              'Your cart is empty',
              style: TextStyle(
                fontFamily: 'Montserrat',
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: Color(0xFF111827),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Add items from our services to get started',
              textAlign: TextAlign.center,
              style: TextStyle(color: Brand.mutedForeground),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: 200,
              child: GradientButton(
                label: 'Book Now',
                height: 40, // default Button size
                onPressed: () =>
                    Navigator.of(context).pushReplacementNamed('/prices'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _filled() {
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
            children: [
              SizedBox(
                height: 40,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    for (final category in _categories)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: _chip(category),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              for (final line in _visible)
                Padding(
                  padding: const EdgeInsets.only(bottom: 14),
                  child: _lineCard(line),
                ),
              const SizedBox(height: 4),
              _summary(),
            ],
          ),
        ),
        _actionBar(),
      ],
    );
  }

  Widget _chip(String category) {
    final active = category == _category;
    return Material(
      color: active ? Colors.transparent : Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => setState(() => _category = category),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            gradient: active ? Brand.gradient : null,
            borderRadius: BorderRadius.circular(16),
            border: active
                ? null
                : Border.all(color: const Color(0xFFD1D5DB)),
          ),
          child: Text(
            category,
            style: TextStyle(
              color: active ? Colors.white : const Color(0xFF374151),
              fontWeight: FontWeight.w600,
              fontSize: 13.5,
            ),
          ),
        ),
      ),
    );
  }

  Widget _lineCard(CartLine line) {
    final ticked = _selected.contains(line.id);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: ticked ? const Color(0xFFEFF6FF) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: ticked ? const Color(0xFF3B82F6) : const Color(0xFFF3F4F6),
          width: 2,
        ),
        boxShadow: const [
          BoxShadow(color: Color(0x11000000), blurRadius: 10, offset: Offset(0, 3)),
        ],
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => setState(() {
              if (ticked) {
                _selected.remove(line.id);
              } else {
                _selected.add(line.id);
              }
            }),
            child: Container(
              height: 24,
              width: 24,
              decoration: BoxDecoration(
                color: ticked ? const Color(0xFF3B82F6) : Colors.transparent,
                shape: BoxShape.circle,
                border: Border.all(
                  color: ticked ? const Color(0xFF3B82F6) : const Color(0xFFD1D5DB),
                  width: 2,
                ),
              ),
              child: ticked
                  ? const Icon(Icons.check, size: 15, color: Colors.white)
                  : null,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  line.name,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 16, // text-base
                    color: Colors.black,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  line.category,
                  style: const TextStyle(fontSize: 14, color: Brand.gray500),
                ),
                const SizedBox(height: 8), // mb-2
                GradientText(
                  '${rupees(line.price)} × ${line.quantity} = ${rupees(line.lineTotal)}',
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 18, // text-lg
                    fontFamily: 'Montserrat',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Row(
                children: [
                  _stepButton(Icons.remove, () => _bump(line, false)),
                  SizedBox(
                    width: 32, // w-8
                    child: Text(
                      '${line.quantity}',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                          fontWeight: FontWeight.w600, color: Colors.black),
                    ),
                  ),
                  _stepButton(Icons.add, () => _bump(line, true)),
                ],
              ),
              const SizedBox(height: 8),
              IconButton(
                visualDensity: VisualDensity.compact,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                icon: const Icon(Icons.delete_outline,
                    size: 16, color: Brand.red500), // w-4 h-4
                onPressed: () => _remove(line),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _stepButton(IconData icon, VoidCallback onTap) {
    return Container(
      height: 32,
      width: 32,
      decoration: BoxDecoration(
        gradient: Brand.gradient,
        borderRadius: BorderRadius.circular(Brand.rLg), // circle at 32px
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(Brand.rLg),
          onTap: onTap,
          child: Icon(icon, color: Colors.white, size: 16),
        ),
      ),
    );
  }

  Widget _summary() {
    final showExpress = _expressChosen && _expressFee > 0;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF3F4F6)),
        boxShadow: const [
          BoxShadow(color: Color(0x11000000), blurRadius: 10, offset: Offset(0, 3)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Order Summary',
            style: TextStyle(
              fontFamily: 'Montserrat',
              fontSize: 17,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 12),
          _row('Selected Items:', '$_tickedCount'),
          const SizedBox(height: 6),
          _row('Selected Total:', rupees(_tickedTotal)),
          if (showExpress) ...[
            const SizedBox(height: 6),
            if (_belowMinimum)
              if (_selected.isNotEmpty)
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Expanded(
                      child: Text('Express Delivery:',
                          style: TextStyle(fontSize: 13, color: Brand.mutedForeground)),
                    ),
                    Expanded(
                      child: Text(
                        '${rupees(_expressFee)} — applies after minimum order is reached',
                        textAlign: TextAlign.right,
                        style: const TextStyle(fontSize: 13, color: Brand.mutedForeground),
                      ),
                    ),
                  ],
                )
              else
                const SizedBox.shrink()
            else
              _row('Express Delivery Fee:', rupees(_expressFee)),
          ],
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 10),
            child: Divider(height: 1),
          ),
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Order Total:',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
                ),
              ),
              GradientText(
                rupees(_orderTotal),
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  fontFamily: 'Montserrat',
                ),
              ),
            ],
          ),
          if (_selected.isEmpty)
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Text('Please select items to place order',
                  style: TextStyle(color: Brand.destructive, fontSize: 13)),
            ),
          if (_belowMinimum && _selected.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                '⚠ Minimum order value of ${rupees(_minOrderPrice)} required',
                style: const TextStyle(
                  color: Brand.destructive,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _row(String label, String value) {
    return Row(
      children: [
        Expanded(child: Text(label, style: const TextStyle(fontSize: 14.5))),
        Text(value,
            style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600)),
      ],
    );
  }

  /// Pinned above the nav bar: the total and the button stay in view while the
  /// item list scrolls. On a short screen they used to sit below the fold.
  Widget _actionBar() {
    final blocked = _selected.isEmpty || _belowMinimum;
    final label = _selected.isEmpty
        ? 'Select Items to Order'
        : _belowMinimum
            ? 'Minimum Order ${rupees(_minOrderPrice)} Required'
            : 'Select Pickup Slot - ${rupees(_orderTotal)}';

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: const BoxDecoration(
        color: Color(0xFAF9FAFB),
        border: Border(top: BorderSide(color: Brand.border)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  _selected.isEmpty
                      ? 'Order Total'
                      : 'Order Total (${_selected.length} item${_selected.length > 1 ? 's' : ''})',
                  style: const TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w500,
                    color: Brand.gray600,
                  ),
                ),
              ),
              GradientText(
                rupees(_orderTotal),
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  fontFamily: 'Montserrat',
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          GradientButton(
            label: label,
            height: 50,
            onPressed: blocked ? null : _checkout,
          ),
        ],
      ),
    );
  }
}
