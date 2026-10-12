import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';

import '../services/api.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/common.dart';

class _Referral {
  const _Referral({required this.name});

  final String name;
}

class ReferEarnScreen extends StatefulWidget {
  const ReferEarnScreen({super.key});

  @override
  State<ReferEarnScreen> createState() => _ReferEarnScreenState();
}

class _ReferEarnScreenState extends State<ReferEarnScreen> {
  String _code = 'Loading...';
  num _referrerReward = 50;
  num _friendReward = 25;
  List<_Referral> _past = [];

  /// Codes still waiting to be spent -- what the "Your Rewards" card counts.
  int _pending = 0;
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
          num.tryParse(settings['referralRewardAmount']?.toString() ?? '') ??
          50;
      _friendReward =
          num.tryParse(
            settings['referredUserRewardAmount']?.toString() ?? '',
          ) ??
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
        _pending = codes.where((c) => c['used'] != true).length;
        _past = used
            .map((c) => _Referral(name: (c['usedBy'] ?? 'Unknown').toString()))
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

  // The screen's own palette is Tailwind's blues and greens rather than the
  // brand purple, which is how the web page is written.
  static const _blue500 = Color(0xFF3B82F6);
  static const _blue700 = Color(0xFF1D4ED8);
  static const _blue100 = Color(0xFFDBEAFE);
  static const _purple600 = Color(0xFF9333EA);
  static const _green500 = Color(0xFF22C55E);
  static const _green50 = Color(0xFFF0FDF4);
  static const _green100 = Color(0xFFDCFCE7);
  static const _green200 = Color(0xFFBBF7D0);
  static const _gray700 = Color(0xFF374151);

  static const _blueGradient = LinearGradient(colors: [_blue500, _blue700]);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Brand.gray50,
      appBar: const AppHeader(title: 'Refer & Earn', gradient: true),
      // This screen carries its own bar too, a size up from the wallet's.
      bottomNavigationBar: const LegacyBottomNav.referEarn(),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 24, 16, 24), // px-4 py-6
        children: [
          _banner(),
          const SizedBox(height: 24), // space-y-6
          _codeCard(),
          const SizedBox(height: 24),
          _howItWorks(),
          const SizedBox(height: 24),
          _rewardsCard(),
          const SizedBox(height: 24),
          _pastReferrals(),
        ],
      ),
    );
  }

  /// `bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-4 text-white
  /// relative overflow-hidden min-h-[140px]`: the text is held to 60% of the
  /// width and a faint line drawing sits behind it on the right.
  Widget _banner() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(Brand.r2xl),
      child: Container(
        constraints: const BoxConstraints(minHeight: 140),
        decoration: const BoxDecoration(
          gradient: LinearGradient(colors: [_blue500, _purple600]),
        ),
        child: Stack(
          children: [
            Positioned(right: -40, top: -40, child: _circle(80)),
            Positioned(right: 16, bottom: -24, child: _circle(48)),
            Positioned(
              right: 8,
              top: 16,
              bottom: 16,
              width: 96, // w-24
              child: Opacity(
                opacity: 0.2,
                child: CustomPaint(painter: _ReferralArt()),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16), // p-4
              child: FractionallySizedBox(
                widthFactor: 0.6, // max-w-[60%]
                alignment: Alignment.centerLeft,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      'Invite friends, earn rewards!',
                      style: TextStyle(
                        fontFamily: 'Montserrat',
                        color: Colors.white,
                        fontSize: 20, // text-xl
                        fontWeight: FontWeight.w700,
                        height: 1.25, // leading-tight
                      ),
                    ),
                    const SizedBox(height: 8), // mb-2
                    Text(
                      'Get ${rupees(_referrerReward)} in your wallet when a '
                      'friend places their first order. They get '
                      '${rupees(_friendReward)} too.',
                      style: const TextStyle(
                        color: _blue100,
                        fontSize: 12, // text-xs
                        height: 1.625, // leading-relaxed
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// `bg-white bg-opacity-5` -- barely there, and only visible against the
  /// gradient.
  Widget _circle(double size) => Container(
    height: size,
    width: size,
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: 0.05),
      shape: BoxShape.circle,
    ),
  );

  Widget _card({required Widget child, bool green = false}) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(16), // p-4
    decoration: BoxDecoration(
      color: green ? null : Colors.white,
      gradient: green
          ? const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [_green50, _green100],
            )
          : null,
      border: green ? Border.all(color: _green200, width: 2) : null,
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

  /// Every card heading on this screen is blue gradient text at `text-lg`.
  Widget _heading(String text, {TextAlign? align}) => GradientText(
    text,
    align: align,
    gradient: _blueGradient,
    style: const TextStyle(
      fontFamily: 'Montserrat',
      fontSize: 18, // text-lg
      fontWeight: FontWeight.w700,
    ),
  );

  Widget _codeCard() => _card(
    child: Column(
      children: [
        _heading('Your Code: $_code', align: TextAlign.center),
        const SizedBox(height: 16), // mb-4
        Row(
          children: [
            Expanded(
              child: SizedBox(
                height: 40, // h-10
                child: OutlinedButton.icon(
                  onPressed: _copy,
                  style: OutlinedButton.styleFrom(
                    backgroundColor: _copied ? _green50 : Colors.white,
                    side: BorderSide(
                      color: _copied ? _green500 : _blue500,
                      width: 2,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(Brand.r2xl),
                    ),
                  ),
                  icon: Icon(
                    _copied ? Icons.check : Icons.copy,
                    size: 16, // w-4
                    color: _copied ? _green500 : _blue500,
                  ),
                  label: Text(
                    _copied ? 'Copied!' : 'Copy Code',
                    style: TextStyle(
                      fontSize: 14, // text-sm
                      fontWeight: FontWeight.w600,
                      color: _copied ? _green500 : _blue500,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8), // gap-2
            Expanded(
              child: GradientButton(
                // "Share Code" is behind an `xs:` breakpoint Tailwind does
                // not define, so the short label is the one that ever
                // shows.
                label: 'Share',
                icon: Icons.share,
                height: 40,
                radius: Brand.r2xl,
                fontSize: 14,
                onPressed: _share,
              ),
            ),
          ],
        ),
      ],
    ),
  );

  Widget _howItWorks() => _card(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _heading('How it works'),
        const SizedBox(height: 16), // mb-4
        Row(
          children: [
            _step(Icons.group, 'Invite Friends'),
            _connector(),
            _step(Icons.shopping_cart, 'Friend Orders'),
            _connector(),
            _step(Icons.account_balance_wallet, 'You Earn'),
          ],
        ),
      ],
    ),
  );

  Widget _rewardsCard() => _card(
    green: true,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _heading('Your Rewards'),
        const SizedBox(height: 16),
        Text(
          '$_pending invite${_pending == 1 ? '' : 's'} not yet used '
          '— worth ${rupees(_pending * _referrerReward)} once those '
          'friends place their first order.',
          style: const TextStyle(
            fontSize: 14, // text-sm
            fontWeight: FontWeight.w500,
            color: _gray700,
          ),
        ),
      ],
    ),
  );

  Widget _pastReferrals() => _card(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _heading('Past Referrals'),
        const SizedBox(height: 16),
        if (_past.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 16), // py-4
            child: Center(
              child: Text(
                'No referrals yet',
                style: TextStyle(color: Brand.mutedForeground),
              ),
            ),
          )
        else
          for (final referral in _past)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8), // py-2
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          referral.name,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const Text(
                          'Joined',
                          style: TextStyle(fontSize: 12, color: _blue500),
                        ),
                      ],
                    ),
                  ),
                  const Text(
                    'Completed',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: _blue500,
                    ),
                  ),
                ],
              ),
            ),
      ],
    ),
  );

  Widget _step(IconData icon, String label) => Expanded(
    child: Column(
      children: [
        Container(
          height: 40, // w-10 h-10
          width: 40,
          decoration: const BoxDecoration(
            gradient: _blueGradient,
            shape: BoxShape.circle,
          ),
          child: Icon(icon, size: 20, color: Colors.white), // w-5
        ),
        const SizedBox(height: 8), // mb-2
        Text(
          label,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 12, // text-xs
            fontWeight: FontWeight.w500,
            height: 1.25, // leading-tight
            color: Colors.black,
          ),
        ),
      ],
    ),
  );

  Widget _connector() => Container(
    width: 16, // w-4
    height: 2, // h-0.5
    margin: const EdgeInsets.symmetric(horizontal: 4), // mx-1
    decoration: const BoxDecoration(gradient: _blueGradient),
  );
}

/// The faint drawing behind the banner: two people joined by a dashed line, a
/// gift box and two rupee signs, on the same 120x120 grid as the inline SVG.
class _ReferralArt extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final k = size.width / 120;
    final fill = Paint()..color = Colors.white;
    final stroke = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2 * k;

    void person(double cx) {
      canvas.drawCircle(Offset(cx * k, 25 * k), 8 * k, fill);
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH((cx - 8) * k, 33 * k, 16 * k, 20 * k),
          Radius.circular(8 * k),
        ),
        fill,
      );
      canvas.drawRect(Rect.fromLTWH((cx - 4) * k, 53 * k, 3 * k, 15 * k), fill);
      canvas.drawRect(Rect.fromLTWH((cx + 1) * k, 53 * k, 3 * k, 15 * k), fill);
    }

    person(30);
    person(90);

    for (var x = 38.0; x < 82; x += 6) {
      canvas.drawLine(
        Offset(x * k, 35 * k),
        Offset((x + 3) * k, 35 * k),
        stroke,
      );
    }

    canvas.drawRect(Rect.fromLTWH(55 * k, 75 * k, 12 * k, 10 * k), fill);
    canvas.drawLine(Offset(61 * k, 75 * k), Offset(61 * k, 85 * k), stroke);
    canvas.drawLine(Offset(55 * k, 78 * k), Offset(67 * k, 78 * k), stroke);

    for (final spot in const [(45.0, 100.0, 12.0), (70.0, 95.0, 10.0)]) {
      final painter = TextPainter(
        text: TextSpan(
          text: '₹',
          style: TextStyle(
            color: Colors.white,
            fontSize: spot.$3 * k,
            fontWeight: FontWeight.bold,
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      painter.paint(canvas, Offset(spot.$1 * k, (spot.$2 - spot.$3) * k));
    }
  }

  @override
  bool shouldRepaint(covariant _ReferralArt oldDelegate) => false;
}
