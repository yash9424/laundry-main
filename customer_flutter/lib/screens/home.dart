import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../models/catalogue.dart';
import '../models/order_charges.dart';
import '../services/api.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/common.dart';
import '../widgets/hero_carousel.dart';
import '../widgets/plan_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _name = 'Guest';
  String? _profileImage;
  List<HeroItem> _hero = [];
  List<TopupPlan> _plans = [];
  List<Map<String, dynamic>> _recentOrders = [];
  OrderChargesConfig _charges = OrderChargesConfig.defaults();
  StreamSubscription<String?>? _authWatch;

  @override
  void initState() {
    super.initState();
    _name = Store.userName.isEmpty ? 'Guest' : Store.userName;
    _authWatch = Store.authChanges.listen((_) {
      if (!mounted) return;
      setState(() => _name = Store.userName.isEmpty ? 'Guest' : Store.userName);
    });
    _load();
  }

  @override
  void dispose() {
    _authWatch?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    final customerId = Store.customerId;

    final results = await Future.wait([
      Api.heroSection(),
      Api.subscriptionPlans(),
      Api.orderCharges(),
      if (customerId != null) Api.profile(customerId),
      if (customerId != null) Api.myOrders(customerId),
    ]);
    if (!mounted) return;

    setState(() {
      if (results[0].ok) {
        _hero = results[0]
            .list
            .whereType<Map>()
            .map((m) => HeroItem.fromJson(Map<String, dynamic>.from(m)))
            .where((h) => h.url.isNotEmpty)
            .toList();
      }
      if (results[1].ok) {
        _plans = results[1]
            .list
            .whereType<Map>()
            .map((m) => TopupPlan.fromJson(Map<String, dynamic>.from(m)))
            .where((p) => p.isActive)
            .toList();
      }
      if (results[2].ok) {
        _charges = OrderChargesConfig.fromJson(results[2].map);
        if (!_charges.expressEnabled) {
          Store.setString(Store.kDeliveryType, 'standard');
        }
      }
      if (results.length > 3 && results[3].ok) {
        final profile = results[3].map;
        final addresses = profile['address'];
        if (addresses is List && addresses.isNotEmpty && addresses.first is Map) {
          final a = Map<String, dynamic>.from(addresses.first as Map);
          final text = [
            a['street'],
            a['city'],
            a['state'],
          ].where((p) => (p?.toString() ?? '').isNotEmpty).join(', ');
          final pincode = a['pincode']?.toString() ?? '';
          final full = pincode.isEmpty ? text : '$text - $pincode';
          if (full.trim().isNotEmpty) {
            Store.setString(Store.kCachedAddress, full);
          }
        }
        final image = profile['profileImage']?.toString();
        if (image != null && image.isNotEmpty) _profileImage = image;
        final name = profile['name']?.toString();
        if (name != null && name.isNotEmpty) _name = name;
      }
      if (results.length > 4 && results[4].ok) {
        _recentOrders = results[4]
            .list
            .whereType<Map>()
            .map((m) => Map<String, dynamic>.from(m))
            .take(3)
            .toList();
      }
    });
  }

  Future<void> _chooseDelivery(String type) async {
    final chosen = (type == 'express' && !_charges.expressEnabled) ? 'standard' : type;
    await Store.setString(Store.kDeliveryType, chosen);
    if (!mounted) return;
    // The cart is deliberately left alone: standard and express hold the same
    // garments at the same rates, only the delivery fee differs.
    Navigator.of(context).pushNamed('/prices');
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        // Home is the bottom of the stack: back puts the app in the background
        // rather than closing it, which is what the Capacitor build did with
        // App.minimizeApp().
        SystemChannels.platform.invokeMethod<void>('SystemNavigator.pop');
      },
      child: Scaffold(
        backgroundColor: Brand.gray50,
        bottomNavigationBar: const AppBottomNav(current: '/home'),
        body: RefreshIndicator(
          onRefresh: _load,
          color: Brand.purple,
          child: ListView(
            padding: EdgeInsets.zero,
            children: [
              _greeting(),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (_hero.isNotEmpty) ...[
                      HeroCarousel(
                        items: _hero,
                        onAction: (link) {
                          if (link.startsWith('/')) {
                            Navigator.of(context).pushNamed(link);
                          }
                        },
                      ),
                      const SizedBox(height: 20),
                    ],
                    _deliveryCards(),
                    if (_plans.isNotEmpty) ...[
                      const SizedBox(height: 20),
                      PlanCarousel(
                        plans: _plans,
                        onViewAll: () =>
                            Navigator.of(context).pushNamed('/subscriptions'),
                      ),
                    ],
                    const SizedBox(height: 20),
                    _recentOrdersCard(),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _greeting() {
    final topInset = MediaQuery.of(context).padding.top;
    return Container(
      padding: EdgeInsets.fromLTRB(16, topInset + 12, 16, 16), // px-4 pt-3 pb-4
      decoration: const BoxDecoration(
        gradient: Brand.gradient,
        boxShadow: [
          BoxShadow(color: Color(0x33452D9B), blurRadius: 18, offset: Offset(0, 4)),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Hi, $_name \u{1F44B}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontFamily: 'Montserrat',
                    color: Colors.white,
                    fontSize: 20, // text-xl
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4), // mb-1
                const Text(
                  "Let's schedule your order",
                  style: TextStyle(color: Colors.white, fontSize: 14), // text-sm
                ),
              ],
            ),
          ),
          GestureDetector(
            onTap: () => Navigator.of(context).pushNamed('/profile'),
            child: Container(
              height: 36, // w-9 h-9
              width: 36,
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(
                color: Colors.white24, // bg-white/20
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white30, width: 2),
              ),
              child: _avatar(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _avatar() {
    final image = _profileImage;
    if (image == null || image.isEmpty) {
      return const Icon(Icons.person, color: Colors.white, size: 16);
    }
    if (image.startsWith('data:')) {
      try {
        return Image.memory(
          base64Decode(image.split(',').last),
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) =>
              const Icon(Icons.person, color: Colors.white, size: 16),
        );
      } catch (_) {
        return const Icon(Icons.person, color: Colors.white, size: 16);
      }
    }
    return Image.network(
      absoluteUrl(image) ?? '',
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) =>
          const Icon(Icons.person, color: Colors.white, size: 16),
    );
  }

  /// Pick how fast you want it back. Left-aligned and equal height whatever the
  /// wording, with the express fee stated rather than hinted at.
  Widget _deliveryCards() {
    final standard = _deliveryCard(
      title: _charges.homeStandardTitle,
      subtitle: _charges.homeStandardSubtitle,
      icon: Icons.shopping_cart,
      gradient: const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFF452D9B), Color(0xFF3B6FC0), Color(0xFF07C8D0)],
        stops: [0, 0.55, 1],
      ),
      iconBackground: Colors.white24,
      onTap: () => _chooseDelivery('standard'),
    );

    if (!_charges.expressEnabled) return standard;

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(child: standard),
        const SizedBox(width: 12),
        Expanded(
          child: _deliveryCard(
            title: _charges.homeExpressTitle,
            subtitle: _charges.homeExpressSubtitle,
            icon: Icons.bolt,
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF1B0F4D), Color(0xFF452D9B), Color(0xFF06869A)],
              stops: [0, 0.55, 1],
            ),
            iconGradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFFF59E0B), Color(0xFFEF4444)],
            ),
            badge: _charges.expressPrice > 0
                ? '+${rupees(_charges.expressPrice)}'
                : null,
            onTap: () => _chooseDelivery('express'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _deliveryCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Gradient gradient,
    required VoidCallback onTap,
    Color? iconBackground,
    Gradient? iconGradient,
    String? badge,
  }) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          constraints: const BoxConstraints(minHeight: 112),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            gradient: gradient,
            borderRadius: BorderRadius.circular(16),
            boxShadow: const [
              BoxShadow(
                  color: Color(0x33000000), blurRadius: 12, offset: Offset(0, 4)),
            ],
          ),
          child: Stack(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    height: 36,
                    width: 36,
                    decoration: BoxDecoration(
                      color: iconBackground,
                      gradient: iconGradient,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(icon, color: Colors.white, size: 18),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      height: 1.2,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 11,
                      height: 1.35,
                    ),
                  ),
                ],
              ),
              if (badge != null)
                Positioned(
                  top: 0,
                  right: 0,
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFF59E0B), Color(0xFFEF4444)],
                      ),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      badge,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _recentOrdersCard() {
    return Container(
      padding: const EdgeInsets.all(16), // p-4
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Brand.r2xl),
        border: Border.all(color: Brand.gray100),
        boxShadow: const [
          BoxShadow(color: Color(0x14000000), blurRadius: 14, offset: Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.history, size: 20, color: Brand.blue600),
              SizedBox(width: 8), // gap-2
              Text(
                'Recent Orders',
                style: TextStyle(
                  fontFamily: 'Montserrat',
                  fontSize: 18, // text-lg
                  fontWeight: FontWeight.w700,
                  color: Brand.gray900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_recentOrders.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 24), // py-6
              decoration: BoxDecoration(
                color: Brand.gray50,
                borderRadius: BorderRadius.circular(Brand.rXl),
              ),
              child: const Column(
                children: [
                  Icon(Icons.shopping_cart_outlined,
                      size: 48, color: Brand.gray300), // w-12 h-12
                  SizedBox(height: 8), // mb-2
                  Text('No recent orders found',
                      style: TextStyle(color: Brand.gray400, fontSize: 14)),
                ],
              ),
            )
          else
            for (final order in _recentOrders)
              Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(12), // p-3
                decoration: BoxDecoration(
                  color: Brand.gray50,
                  borderRadius: BorderRadius.circular(Brand.rXl),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Order #${order['orderId'] ?? ''}',
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          color: Brand.blue600,
                          fontSize: 14, // text-sm
                        ),
                      ),
                    ),
                    SizedBox(
                      height: 36, // h-9
                      child: Material(
                        color: Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(12),
                          onTap: () => Navigator.of(context).pushNamed(
                            '/order-details',
                            arguments: {'orderId': order['orderId']?.toString()},
                          ),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14),
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              gradient: Brand.gradient,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.history,
                                    size: 12, color: Colors.white), // w-3 h-3
                                SizedBox(width: 4), // mr-1
                                Text(
                                  'View Order',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 12, // text-xs
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
        ],
      ),
    );
  }
}
