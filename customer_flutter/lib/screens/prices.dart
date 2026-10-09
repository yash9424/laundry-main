import 'package:flutter/material.dart';

import '../models/catalogue.dart';
import '../models/order_charges.dart';
import '../services/api.dart';
import '../services/cart.dart';
import '../theme/brand.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/common.dart';
import '../widgets/lucide.dart';

/// The catalogue. Categories first, then a list of garments: the picture, the
/// name, its own description and the price, with one button to add it that
/// turns into a stepper once there is something to count.
class PricesScreen extends StatefulWidget {
  const PricesScreen({super.key});

  /// Shown once per app run, as the web app did with sessionStorage.
  static bool _tutorialSeen = false;

  @override
  State<PricesScreen> createState() => _PricesScreenState();
}

class _PricesScreenState extends State<PricesScreen> {
  List<PricingItem> _items = [];
  List<PricingCategory> _categories = [];
  OrderChargesConfig _charges = OrderChargesConfig.defaults();
  num _minOrderPrice = 0;
  bool _loading = true;

  /// null = showing the category grid; 'All' or a category name = showing items.
  String? _selected;

  @override
  void initState() {
    super.initState();
    _load();
    if (!PricesScreen._tutorialSeen) {
      PricesScreen._tutorialSeen = true;
      Future.delayed(const Duration(seconds: 1), () {
        if (mounted) _showHowToOrder();
      });
    }
  }

  Future<void> _load() async {
    final results = await Future.wait([
      Api.pricingItems(),
      Api.pricingCategories(),
      Api.orderCharges(),
      Api.walletSettings(),
    ]);
    if (!mounted) return;

    final items = results[0];
    final categories = results[1];
    final charges = results[2];
    final wallet = results[3];

    setState(() {
      if (items.ok) {
        _items = items.list
            .whereType<Map>()
            .map((m) => PricingItem.fromJson(Map<String, dynamic>.from(m)))
            .toList();
      }
      if (categories.ok) {
        _categories = categories.list
            .whereType<Map>()
            .map((m) => PricingCategory.fromJson(Map<String, dynamic>.from(m)))
            .toList();
      }
      if (charges.ok) _charges = OrderChargesConfig.fromJson(charges.map);
      if (wallet.ok) {
        _minOrderPrice = WalletSettings.fromJson(wallet.map).minOrderPrice;
      }
      _loading = false;
    });
  }

  List<PricingItem> get _filtered => _selected == 'All'
      ? _items
      : _items.where((i) => i.category == _selected).toList();

  Future<void> _bump(PricingItem item, bool up) async {
    await Cart.bump(
      id: item.id,
      name: item.name,
      price: item.price,
      category: item.category,
      up: up,
    );
    if (mounted) setState(() {});
  }

  void _showHowToOrder() {
    showDialog<void>(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(20),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: Padding(
          padding: const EdgeInsets.all(22),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                GradientText(
                  _charges.howToOrderTitle,
                  align: TextAlign.center,
                  style: const TextStyle(
                    fontFamily: 'Montserrat',
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 22),
                for (var i = 0; i < _charges.howToOrderSteps.length; i++) ...[
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        height: 30,
                        width: 30,
                        alignment: Alignment.center,
                        decoration: const BoxDecoration(
                          gradient: Brand.gradient,
                          shape: BoxShape.circle,
                        ),
                        child: Text(
                          '${i + 1}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _charges.howToOrderSteps[i].title,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 15,
                                color: Color(0xFF1F2937),
                              ),
                            ),
                            if (_charges.howToOrderSteps[i].description.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: 2),
                                child: Text(
                                  _charges.howToOrderSteps[i].description,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: Brand.mutedForeground,
                                    height: 1.45,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                ],
                const SizedBox(height: 4),
                GradientButton(
                  label: 'Got it!',
                  height: 48,
                  radius: 16,
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _preview(PricingItem item) {
    showDialog<void>(
      context: context,
      barrierColor: Colors.black54,
      builder: (_) => StatefulBuilder(
        builder: (dialogContext, rebuild) {
          final qty = Cart.quantityOf(item.id);
          return Dialog(
            backgroundColor: Colors.white,
            surfaceTintColor: Colors.transparent,
            insetPadding: const EdgeInsets.all(18),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: 380,
                maxHeight: MediaQuery.of(context).size.height * 0.85,
              ),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Stack(
                      children: [
                        ClipRRect(
                          borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(24),
                          ),
                          child: AspectRatio(
                            aspectRatio: 1,
                            child: item.image == null
                                ? DecoratedBox(
                                    decoration:
                                        BoxDecoration(gradient: Brand.gradient),
                                    child: Center(
                                      child: Lucide.shirt(
                                          size: 86, color: Colors.white70),
                                    ),
                                  )
                                : Image.network(
                                    item.image!,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => ColoredBox(
                                      color: Color(0xFFF3F4F6),
                                      child: Center(
                                        child: Lucide.shirt(
                                            size: 64, color: Color(0xFFC4B5FD)),
                                      ),
                                    ),
                                  ),
                          ),
                        ),
                        Positioned(
                          top: 12,
                          right: 12,
                          child: Material(
                            color: Colors.black38,
                            shape: const CircleBorder(),
                            child: InkWell(
                              customBorder: const CircleBorder(),
                              onTap: () => Navigator.of(dialogContext).pop(),
                              child: const SizedBox(
                                height: 36,
                                width: 36,
                                child: Icon(Icons.close,
                                    color: Colors.white, size: 20),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (item.category.isNotEmpty)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEDE9FE),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                item.category.toUpperCase(),
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.5,
                                  color: Brand.purple,
                                ),
                              ),
                            ),
                          const SizedBox(height: 10),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Text(
                                  item.name,
                                  style: const TextStyle(
                                    fontFamily: 'Montserrat',
                                    fontSize: 20,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF1F2937),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              GradientText(
                                rupees(item.price),
                                style: const TextStyle(
                                  fontFamily: 'Montserrat',
                                  fontSize: 20,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                          if ((item.description ?? '').trim().isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 12),
                              child: Text(
                                item.description!.trim(),
                                style: const TextStyle(
                                  fontSize: 14,
                                  height: 1.55,
                                  color: Brand.gray600,
                                ),
                              ),
                            ),
                          const SizedBox(height: 20),
                          // Add it from here too: closing the picture just to
                          // find the same garment again is a step nobody needs.
                          Row(
                            children: [
                              _squareButton(Icons.remove, 40, () async {
                                await _bump(item, false);
                                rebuild(() {});
                              }),
                              SizedBox(
                                width: 44,
                                child: Text(
                                  '$qty',
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                              _squareButton(Icons.add, 40, () async {
                                await _bump(item, true);
                                rebuild(() {});
                              }),
                              const SizedBox(width: 14),
                              Expanded(
                                child: SizedBox(
                                  height: 40,
                                  child: OutlinedButton(
                                    onPressed: () =>
                                        Navigator.of(dialogContext).pop(),
                                    style: OutlinedButton.styleFrom(
                                      side: const BorderSide(
                                          color: Brand.purple, width: 1.5),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                    ),
                                    child: const Text(
                                      'Done',
                                      style: TextStyle(
                                        color: Brand.purple,
                                        fontWeight: FontWeight.w600,
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
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _squareButton(IconData icon, double size, VoidCallback onTap) {
    return Container(
      height: size,
      width: size,
      decoration: BoxDecoration(
        gradient: Brand.gradient,
        borderRadius: BorderRadius.circular(size > 36 ? Brand.rXl : Brand.rLg),
        boxShadow: const [
          BoxShadow(color: Color(0x22000000), blurRadius: 6, offset: Offset(0, 2)),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius:
              BorderRadius.circular(size > 36 ? Brand.rXl : Brand.rLg),
          onTap: onTap,
          child: Icon(icon, color: Colors.white, size: size * 0.46),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        // Inside a category, back goes up a level rather than out of the app.
        if (_selected != null) {
          setState(() => _selected = null);
        } else {
          Navigator.of(context).pushReplacementNamed('/home');
        }
      },
      child: Scaffold(
        backgroundColor: Brand.gray50,
        appBar: AppHeader(
          title: 'Categories',
          gradient: true,
          onBack: () {
            if (_selected != null) {
              setState(() => _selected = null);
            } else {
              Navigator.of(context).pushReplacementNamed('/home');
            }
          },
          action: IconButton(
            tooltip: 'How to order',
            icon: const Icon(Icons.info_outline, color: Colors.white),
            onPressed: _showHowToOrder,
          ),
        ),
        bottomNavigationBar: const AppBottomNav(current: '/prices'),
        body: Stack(
          children: [
            ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              children: [
                if (_selected == null) _categoryGrid(),
                if (_loading)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 32),
                    child: Center(
                      child: Text('Loading prices...',
                          style: TextStyle(color: Brand.mutedForeground)),
                    ),
                  )
                else if (_items.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: const Center(
                      child: Text('No pricing items available yet.',
                          style: TextStyle(color: Brand.gray600, fontSize: 13)),
                    ),
                  )
                else if (_selected != null)
                  _itemList(),
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFFF0EBF8), Color(0xFFE0F7F9)],
                    ),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Text(
                    '*All services include professional steam ironing as standard.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 12,
                      color: Color(0xFF374151),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                if (_minOrderPrice > 0)
                  Container(
                    margin: const EdgeInsets.only(top: 12),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF3F4F6),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      'Minimum order value: ${rupees(_minOrderPrice)}',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Brand.mutedForeground,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
              ],
            ),
            // The running total, floating just above the nav bar.
            ValueListenableBuilder<int>(
              valueListenable: Cart.revision,
              builder: (context, _, __) {
                if (Cart.isEmpty) return const SizedBox.shrink();
                final count = Cart.itemCount;
                return Positioned(
                  left: 16,
                  right: 16,
                  bottom: 12,
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(16),
                      onTap: () => Navigator.of(context).pushNamed('/cart'),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 12), // px-4 py-3
                        decoration: BoxDecoration(
                          gradient: Brand.gradient,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: Brand.purple.withValues(alpha: 0.35),
                              blurRadius: 16,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.shopping_cart,
                                color: Colors.white, size: 20),
                            const SizedBox(width: 8),
                            Text(
                              '$count item${count > 1 ? 's' : ''}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                                fontSize: 14, // text-sm
                              ),
                            ),
                            const Spacer(),
                            Text(
                              rupees(Cart.total),
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                                fontSize: 16, // text-base
                                fontFamily: 'Montserrat',
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _categoryGrid() {
    final tiles = <Widget>[
      _categoryTile(
        label: 'All Items',
        count: _items.length,
        icon: Icons.history,
        onTap: () => setState(() => _selected = 'All'),
      ),
      for (final category in _categories)
        _categoryTile(
          label: category.name,
          count: _items.where((i) => i.category == category.name).length,
          icon: category.name.toLowerCase().contains('household') ||
                  category.name.toLowerCase().contains('home')
              ? Icons.bed_outlined
              : Icons.checkroom,
          image: category.image,
          onTap: () => setState(() => _selected = category.name),
        ),
    ];

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12, // gap-3
      crossAxisSpacing: 12,
      childAspectRatio: 1.55,
      children: tiles,
    );
  }

  Widget _categoryTile({
    required String label,
    required int count,
    required IconData icon,
    required VoidCallback onTap,
    String? image,
  }) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      elevation: 2,
      shadowColor: Colors.black12,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                height: 40, // w-10 h-10
                width: 40,
                clipBehavior: Clip.antiAlias,
                decoration: BoxDecoration(
                  gradient: image == null ? Brand.gradient : null,
                  color: image == null ? null : const Color(0xFFF3F4F6),
                  shape: BoxShape.circle,
                ),
                child: image == null
                    ? Icon(icon, color: Colors.white, size: 22)
                    : Image.network(
                        image,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) =>
                            Icon(icon, color: Brand.purple, size: 22),
                      ),
              ),
              const SizedBox(height: 10),
              Text(
                label,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontFamily: 'Montserrat',
                  fontSize: 14, // text-sm
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 4), // mb-1
              Text(
                '$count items',
                style: const TextStyle(fontSize: 12, color: Brand.gray500),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _itemList() {
    final items = _filtered;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton(
            onPressed: () => setState(() => _selected = null),
            style: TextButton.styleFrom(
              padding: EdgeInsets.zero,
              minimumSize: const Size(0, 36),
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: const Text(
              '← Back to all categories',
              style: TextStyle(
                color: Brand.blue500,
                fontSize: 14, // text-sm
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ),
        const SizedBox(height: 10),
        GradientText(
          _selected == 'All' ? 'All Items' : _selected!,
          style: const TextStyle(
            fontFamily: 'Montserrat',
            fontSize: 18, // text-lg
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 12),
        if (items.isEmpty)
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Center(
              child: Text('Nothing in this category yet.',
                  style: TextStyle(color: Brand.mutedForeground, fontSize: 13)),
            ),
          )
        else
          Container(
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                for (final item in items) _itemRow(item),
              ],
            ),
          ),
      ],
    );
  }

  Widget _itemRow(PricingItem item) {
    final qty = Cart.quantityOf(item.id);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(
        children: [
          // Tapping the garment opens it larger, which is the only way to see
          // what a name like "Linen Shirt" actually refers to.
          GestureDetector(
            onTap: () => _preview(item),
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  height: 84,
                  width: 84,
                  clipBehavior: Clip.antiAlias,
                  decoration: BoxDecoration(
                    color: item.image != null ? const Color(0xFFF4F2EF) : null,
                    gradient: item.image == null
                        ? const LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [Color(0xFFF5F3FF), Color(0xFFECFEFF)],
                          )
                        : null,
                    borderRadius: BorderRadius.circular(22),
                  ),
                  child: item.image == null
                      ? Center(
                          child: Lucide.shirt(
                              size: 32, color: Color(0xFFC4B5FD)),
                        )
                      : Image.network(
                          item.image!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Center(
                            child: Lucide.shirt(
                                size: 32, color: Color(0xFFC4B5FD)),
                          ),
                        ),
                ),
                Positioned(
                  right: -2,
                  bottom: -2,
                  child: Container(
                    height: 24,
                    width: 24,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                            color: Color(0x22000000),
                            blurRadius: 4,
                            offset: Offset(0, 1)),
                      ],
                    ),
                    child: const Icon(Icons.zoom_in,
                        size: 15, color: Brand.purple),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    height: 1.25,
                    color: Color(0xFF111827),
                  ),
                ),
                // Only the item's own description -- there used to be a
                // "Professional steam ironing" line under every garment,
                // saying the same thing 159 times.
                if ((item.description ?? '').trim().isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      item.description!.trim(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, color: Brand.mutedForeground),
                    ),
                  ),
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: GradientText(
                    rupees(item.price),
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      fontFamily: 'Montserrat',
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          if (qty == 0)
            _squareButton(Icons.add, 40, () => _bump(item, true))
          else
            Row(
              children: [
                _squareButton(Icons.remove, 32, () => _bump(item, false)),
                SizedBox(
                  width: 28,
                  child: Text(
                    '$qty',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                    ),
                  ),
                ),
                _squareButton(Icons.add, 32, () => _bump(item, true)),
              ],
            ),
        ],
      ),
    );
  }
}
