import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';

import '../services/api.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/common.dart';

class _Referral {
  const _Referral({required this.name, required this.joined});

  final String name;
  final DateTime? joined;
}

class ReferEarnScreen extends StatefulWidget {
  const ReferEarnScreen({super.key});

  @override
  State<ReferEarnScreen> createState() => _ReferEarnScreenState();
}

class _ReferEarnScreenState extends State<ReferEarnScreen> {
  static final _date = DateFormat('dd/MM/yyyy');

  String _code = 'Loading...';
  num _referrerReward = 50;
  num _friendReward = 25;
  List<_Referral> _past = [];
  bool _copied = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final customerId = Store.customerId;
    final results = await Future.wait([
      Api.walletSettings(),
      if (customerId != null) Api.profile(customerId),
    ]);
    if (!mounted) return;

    if (results[0].ok) {
      final settings = results[0].map;
      _referrerReward =
          num.tryParse(settings['referralRewardAmount']?.toString() ?? '') ?? 50;
      _friendReward =
          num.tryParse(settings['referredUserRewardAmount']?.toString() ?? '') ??
              25;
    }

    if (results.length > 1 && results[1].ok && customerId != null) {
      final customer = results[1].map;
      final codes = (customer['referralCodes'] is List)
          ? (customer['referralCodes'] as List)
              .whereType<Map>()
              .map((m) => Map<String, dynamic>.from(m))
              .toList()
          : <Map<String, dynamic>>[];

      Map<String, dynamic>? active;
      for (final entry in codes) {
        if (entry['used'] != true) {
          active = entry;
          break;
        }
      }

      if (active == null) {
        // No unused code left, so mint one. The format matches what the web
        // screen generated: three letters of the name plus a running number.
        final name = (customer['name'] ?? '').toString();
        final prefix = (name.length >= 3 ? name.substring(0, 3) : 'USR')
            .toUpperCase()
            .padRight(3, 'X');
        final suffix = (codes.length + 1).toString().padLeft(4, '0');
        final generated = '$prefix$suffix';
        codes.add({
          'code': generated,
          'used': false,
          'createdAt': DateTime.now().toIso8601String(),
        });
        await Api.patchCustomer(customerId, {'referralCodes': codes});
        active = {'code': generated};
      }

      final used = codes.where((c) => c['used'] == true).toList();
      if (!mounted) return;
      setState(() {
        _code = (active!['code'] ?? 'ERROR').toString();
        _past = used
            .map((c) => _Referral(
                  name: (c['usedBy'] ?? 'Unknown').toString(),
                  joined:
                      DateTime.tryParse(c['usedAt']?.toString() ?? '')?.toLocal(),
                ))
            .toList();
      });
    } else if (mounted) {
      setState(() => _code = 'ERROR');
    }
  }

  String get _shareText =>
      '\u{1F381} Join Urban Steam and get ${rupees(_friendReward)} in your '
      'wallet on your first order!\n\n'
      'Use my referral code: $_code\n\n'
      "Don't miss out on this exclusive offer! \u{1F680}";

  Future<void> _copy() async {
    await Clipboard.setData(ClipboardData(text: _code));
    if (!mounted) return;
    setState(() => _copied = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _copied = false);
    });
  }

  Future<void> _share() async {
    try {
      await Share.share(_shareText, subject: 'Urban Steam - Refer a friend');
    } catch (_) {
      await Clipboard.setData(ClipboardData(text: _shareText));
      if (mounted) showToast(context, 'Copied the invite to your clipboard');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Brand.gray50,
      appBar: const AppHeader(title: 'Refer & Earn', gradient: true),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 28),
        children: [
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF3B82F6), Color(0xFF7C3AED)],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Invite friends, earn rewards!',
                  style: TextStyle(
                    fontFamily: 'Montserrat',
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    height: 1.25,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Get ${rupees(_referrerReward)} in your wallet when a friend '
                  'places their first order. They get ${rupees(_friendReward)} too.',
                  style: const TextStyle(
                      color: Color(0xFFDBEAFE), fontSize: 13.5, height: 1.5),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(22),
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
            child: Column(
              children: [
                Text(
                  'Your Code: $_code',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontFamily: 'Montserrat',
                    fontSize: 19,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF2563EB),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: SizedBox(
                        height: 48,
                        child: OutlinedButton.icon(
                          onPressed: _copy,
                          style: OutlinedButton.styleFrom(
                            backgroundColor: _copied
                                ? const Color(0xFFF0FDF4)
                                : Colors.white,
                            side: BorderSide(
                              color: _copied
                                  ? Brand.green600
                                  : const Color(0xFF3B82F6),
                              width: 2,
                            ),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16)),
                          ),
                          icon: Icon(
                            _copied ? Icons.check : Icons.copy,
                            size: 18,
                            color: _copied
                                ? Brand.green600
                                : const Color(0xFF3B82F6),
                          ),
                          label: Text(
                            _copied ? 'Copied!' : 'Copy Code',
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              color: _copied
                                  ? Brand.green600
                                  : const Color(0xFF3B82F6),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: GradientButton(
                        label: 'Share Code',
                        icon: Icons.share,
                        height: 48,
                        fontSize: 14.5,
                        onPressed: _share,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(22),
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
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'How it works',
                  style: TextStyle(
                    fontFamily: 'Montserrat',
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF2563EB),
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    _step(Icons.group, 'Invite Friends'),
                    _connector(),
                    _step(Icons.shopping_cart, 'Friend Orders'),
                    _connector(),
                    _step(Icons.account_balance_wallet, 'Both Earn'),
                  ],
                ),
              ],
            ),
          ),
          if (_past.isNotEmpty) ...[
            const SizedBox(height: 20),
            const Text(
              'Friends who joined',
              style: TextStyle(
                fontFamily: 'Montserrat',
                fontSize: 17,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 12),
            for (final referral in _past)
              Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.person_outline,
                        size: 19, color: Color(0xFF3B82F6)),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        referral.name,
                        style: const TextStyle(
                            fontSize: 14.5, fontWeight: FontWeight.w500),
                      ),
                    ),
                    if (referral.joined != null)
                      Text(
                        _date.format(referral.joined!),
                        style: const TextStyle(
                            fontSize: 12, color: Brand.mutedForeground),
                      ),
                  ],
                ),
              ),
          ],
        ],
      ),
    );
  }

  Widget _step(IconData icon, String label) => Expanded(
        child: Column(
          children: [
            Container(
              height: 44,
              width: 44,
              decoration: const BoxDecoration(
                gradient: Brand.gradient,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 21, color: Colors.white),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  fontSize: 12.5, fontWeight: FontWeight.w500, height: 1.3),
            ),
          ],
        ),
      );

  Widget _connector() => Container(
        width: 20,
        height: 2,
        margin: const EdgeInsets.only(bottom: 26),
        decoration: const BoxDecoration(gradient: Brand.gradient),
      );
}
