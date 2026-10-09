import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../services/api.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/common.dart';

class _Transaction {
  const _Transaction({
    required this.id,
    required this.title,
    required this.reason,
    required this.amount,
    required this.credit,
    required this.when,
  });

  final String id;
  final String title;
  final String reason;
  final num amount;
  final bool credit;
  final DateTime? when;

  String get signed => '${credit ? '+' : '-'}${rupees(amount)}';
}

class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  static final _date = DateFormat('dd/MM/yyyy');

  num _balance = 0;
  num _due = 0;
  List<_Transaction> _history = [];
  bool _loading = true;
  bool _refreshing = false;

  @override
  void initState() {
    super.initState();
    _balance = Store.getDouble(Store.kCachedWalletBalance);
    _load();
  }

  Future<void> _load({bool refresh = false}) async {
    final customerId = Store.customerId;
    if (customerId == null) {
      setState(() => _loading = false);
      return;
    }
    if (refresh) setState(() => _refreshing = true);

    final results = await Future.wait([
      Api.profile(customerId),
      Api.walletTransactions(customerId),
    ]);
    if (!mounted) return;

    setState(() {
      if (results[0].ok) {
        _balance = num.tryParse(results[0].map['walletBalance']?.toString() ?? '') ?? 0;
        _due = num.tryParse(results[0].map['dueAmount']?.toString() ?? '') ?? 0;
        Store.setString(Store.kCachedWalletBalance, _balance.toString());
      }
      if (results[1].ok) {
        _history = results[1]
            .list
            .whereType<Map>()
            .map((raw) {
              final t = Map<String, dynamic>.from(raw);
              final credit = t['action'] == 'increase';
              return _Transaction(
                id: (t['_id'] ?? '').toString(),
                title: 'Balance ${credit ? 'Added' : 'Deducted'}',
                reason: (t['reason'] ?? '').toString(),
                amount: num.tryParse(t['amount']?.toString() ?? '') ?? 0,
                credit: credit,
                when: DateTime.tryParse(t['createdAt']?.toString() ?? '')
                    ?.toLocal(),
              );
            })
            .toList();
      }
      _loading = false;
      _refreshing = false;
    });
  }

  /// The charges that were pushed onto the due rather than taken from the
  /// balance. The server records why in the reason text.
  List<_Transaction> get _dueCharges => _history
      .where((t) => t.reason.toLowerCase().contains('added to due'))
      .toList();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Brand.gray50,
      appBar: AppHeader(
        title: 'Wallet',
        gradient: true,
        action: IconButton(
          icon: _refreshing
              ? const SizedBox(
                  height: 18,
                  width: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation(Colors.white),
                  ),
                )
              : const Icon(Icons.refresh, color: Colors.white),
          onPressed: _refreshing ? null : () => _load(refresh: true),
        ),
      ),
      // The web screen carried its own copy of the nav bar whose middle button
      // went to the legacy booking page; this uses the one every other screen
      // uses, so the cart button goes to the cart.
      bottomNavigationBar: const AppBottomNav(current: '/wallet'),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Brand.purple))
          : RefreshIndicator(
              onRefresh: () => _load(refresh: true),
              color: Brand.purple,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
                children: [
                  _balanceCard(),
                  if (_due > 0) ...[
                    const SizedBox(height: 20),
                    _dueCard(),
                  ],
                  const SizedBox(height: 24),
                  const Text(
                    'Wallet History (Last 5)',
                    style: TextStyle(
                      fontFamily: 'Montserrat',
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF2563EB),
                    ),
                  ),
                  const SizedBox(height: 14),
                  if (_history.isEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 24),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Center(
                        child: Text('No wallet activity yet.',
                            style: TextStyle(color: Brand.mutedForeground)),
                      ),
                    )
                  else
                    for (final transaction in _history.take(5))
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _transactionCard(transaction),
                      ),
                  const SizedBox(height: 12),
                  Material(
                    color: Colors.transparent,
                    borderRadius: BorderRadius.circular(16),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(16),
                      onTap: () =>
                          Navigator.of(context).pushNamed('/refer-earn'),
                      child: Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [Color(0xFFF0FDF4), Color(0xFFDCFCE7)],
                          ),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                              color: const Color(0xFFBBF7D0), width: 2),
                        ),
                        child: Row(
                          children: [
                            const Expanded(
                              child: Text(
                                'Invite a friend to Urban Steam.',
                                style: TextStyle(
                                  fontSize: 14.5,
                                  fontWeight: FontWeight.w500,
                                  color: Color(0xFF1F2937),
                                ),
                              ),
                            ),
                            Container(
                              height: 38,
                              width: 38,
                              decoration: const BoxDecoration(
                                gradient: Brand.gradient,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.share,
                                  size: 18, color: Colors.white),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _balanceCard() {
    return Container(
      padding: const EdgeInsets.all(26),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFEFF6FF), Color(0xFFDBEAFE)],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFBFDBFE), width: 2),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: const [
              Icon(Icons.credit_card, size: 22, color: Color(0xFF2563EB)),
              SizedBox(width: 8),
              Text(
                'Available Balance:',
                style: TextStyle(
                  fontFamily: 'Montserrat',
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF2563EB),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            rupees(_balance),
            style: const TextStyle(
              fontFamily: 'Montserrat',
              fontSize: 34,
              fontWeight: FontWeight.w700,
              color: Color(0xFF1D4ED8),
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Use this balance on any order',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: Color(0xFF374151),
            ),
          ),
        ],
      ),
    );
  }

  Widget _dueCard() {
    final charges = _dueCharges;
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFFEF2F2), Color(0xFFFEE2E2)],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFECACA), width: 2),
      ),
      child: Column(
        children: [
          const Text('⚠️', style: TextStyle(fontSize: 32)),
          const SizedBox(height: 6),
          const Text(
            'Pending Due Amount',
            style: TextStyle(
              fontFamily: 'Montserrat',
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: Brand.destructive,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            rupees(_due),
            style: const TextStyle(
              fontFamily: 'Montserrat',
              fontSize: 32,
              fontWeight: FontWeight.w700,
              color: Brand.destructive,
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            'This amount will be added to your next order payment',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: Color(0xFF374151),
            ),
          ),
          if (charges.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Divider(color: Color(0xFFFECACA), thickness: 2),
            const SizedBox(height: 12),
            const Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Last Due Charge:',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: Brand.destructive,
                ),
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          charges.first.reason,
                          style: const TextStyle(
                              fontSize: 13, color: Brand.gray600, height: 1.4),
                        ),
                        if (charges.first.when != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(
                              _date.format(charges.first.when!),
                              style: const TextStyle(
                                  fontSize: 11.5, color: Brand.disabled),
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    charges.first.signed,
                    style: const TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                      color: Brand.destructive,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _transactionCard(_Transaction transaction) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(color: Color(0x14000000), blurRadius: 12, offset: Offset(0, 4)),
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
                  transaction.title,
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, fontSize: 14.5),
                ),
                const SizedBox(height: 2),
                Text(
                  transaction.reason,
                  style: const TextStyle(
                      fontSize: 13, color: Brand.mutedForeground, height: 1.4),
                ),
                if (transaction.when != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 3),
                    child: Text(
                      _date.format(transaction.when!),
                      style: const TextStyle(
                          fontSize: 11.5, color: Brand.disabled),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Text(
            transaction.signed,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: transaction.credit ? Brand.green600 : Brand.destructive,
            ),
          ),
        ],
      ),
    );
  }
}
