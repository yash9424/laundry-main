import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/catalogue.dart';
import '../models/customer.dart';
import '../services/api.dart';
import '../services/notifications.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/common.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  CustomerProfile? _profile;
  List<CustomerAddress> _addresses = [];
  List<Map<String, dynamic>> _payments = [];
  num _walletBalance = 0;
  bool _loading = true;
  bool _notificationsOn = true;

  @override
  void initState() {
    super.initState();
    _primeFromCache();
    _load();
  }

  /// The cached copy renders immediately, so the screen is never blank while
  /// the request is in flight.
  void _primeFromCache() {
    final cached = Store.getJson(Store.kCachedProfile);
    if (cached is Map) {
      final profile = cached['profile'];
      if (profile is Map) {
        _profile = CustomerProfile.fromJson(Map<String, dynamic>.from(profile));
        _addresses = _profile!.addresses;
        _payments = (profile['paymentMethods'] is List)
            ? (profile['paymentMethods'] as List)
                .whereType<Map>()
                .map((m) => Map<String, dynamic>.from(m))
                .toList()
            : [];
        _walletBalance = _profile!.walletBalance;
        _loading = false;
      }
    }
    _notificationsOn = Store.getString('notificationsEnabled') != 'false';
  }

  Future<void> _load() async {
    final customerId = Store.customerId;
    if (customerId == null) {
      if (mounted) {
        Navigator.of(context).pushNamedAndRemoveUntil('/login', (r) => false);
      }
      return;
    }
    final result = await Api.profile(customerId);
    if (!mounted) return;
    if (!result.ok) {
      setState(() => _loading = false);
      return;
    }

    final profile = CustomerProfile.fromJson(result.map);
    setState(() {
      _profile = profile;
      _addresses = profile.addresses;
      _payments = (result.map['paymentMethods'] is List)
          ? (result.map['paymentMethods'] as List)
              .whereType<Map>()
              .map((m) => Map<String, dynamic>.from(m))
              .toList()
          : [];
      _walletBalance = profile.walletBalance;
      _loading = false;
    });

    await Store.setJson(Store.kCachedProfile, {'profile': result.map});
    await Store.setString(
        Store.kCachedWalletBalance, profile.walletBalance.toString());
    if (profile.name.isNotEmpty) await Store.setUserName(profile.name);
  }

  Future<bool> _saveAddresses(List<CustomerAddress> addresses) async {
    final customerId = Store.customerId;
    if (customerId == null) return false;
    final result = await Api.saveProfile(customerId, {
      'address': addresses.map((a) => a.toJson()).toList(),
    });
    return result.ok;
  }

  Future<void> _deleteAddress(int index) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Delete address?',
            style: TextStyle(
                fontFamily: 'Montserrat', fontWeight: FontWeight.w700)),
        content: Text(_addresses[index].oneLine),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Keep', style: TextStyle(color: Brand.mutedForeground)),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child:
                const Text('Delete', style: TextStyle(color: Brand.destructive)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    // The whole list is sent back minus this one, keeping each address object
    // intact. The web screen rebuilt them by splitting the display strings,
    // which silently dropped the dropped-pin coordinates.
    final next = [..._addresses]..removeAt(index);
    final ok = await _saveAddresses(next);
    if (!mounted) return;
    if (ok) {
      setState(() => _addresses = next);
    } else {
      showToast(context, 'Could not delete that address.', error: true);
      await _load();
    }
  }

  Future<bool> _savePayments(List<Map<String, dynamic>> payments) async {
    final customerId = Store.customerId;
    if (customerId == null) return false;
    final result =
        await Api.saveProfile(customerId, {'paymentMethods': payments});
    return result.ok;
  }

  Future<void> _setPrimary(int index) async {
    final next = [
      for (var i = 0; i < _payments.length; i++)
        {..._payments[i], 'isPrimary': i == index}
    ];
    final ok = await _savePayments(next);
    if (!mounted) return;
    if (ok) {
      setState(() => _payments = next);
    } else {
      showToast(context, 'Could not update the payment method.', error: true);
    }
  }

  Future<void> _deletePayment(int index) async {
    final next = [..._payments]..removeAt(index);
    final ok = await _savePayments(next);
    if (!mounted) return;
    if (ok) {
      setState(() => _payments = next);
    } else {
      showToast(context, 'Could not delete the payment method.', error: true);
    }
  }

  bool get _hasEveryPaymentType {
    final types = _payments.map((p) => p['type']).toSet();
    return const ['UPI', 'Card', 'Bank Transfer'].every(types.contains);
  }

  Future<void> _paymentSheet({int? editIndex}) async {
    final existing = editIndex == null ? null : _payments[editIndex];
    final saved = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (_) => _PaymentSheet(existing: existing),
    );
    if (saved == null) return;

    final next = [..._payments];
    if (editIndex == null) {
      next.add(saved);
    } else {
      next[editIndex] = {...saved, 'isPrimary': existing?['isPrimary'] == true};
    }
    // The first method added becomes the primary one, otherwise checkout would
    // block on "set a primary payment method" straight after adding one.
    if (!next.any((p) => p['isPrimary'] == true) && next.isNotEmpty) {
      next[0] = {...next[0], 'isPrimary': true};
    }

    final ok = await _savePayments(next);
    if (!mounted) return;
    if (ok) {
      setState(() => _payments = next);
    } else {
      showToast(context, 'Could not save the payment method.', error: true);
    }
  }

  Future<void> _logout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Log out?',
            style: TextStyle(
                fontFamily: 'Montserrat', fontWeight: FontWeight.w700)),
        content: const Text('You will need to sign in again to place an order.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Stay', style: TextStyle(color: Brand.mutedForeground)),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Log out',
                style: TextStyle(color: Brand.destructive)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    // Everything belonging to this account goes, and the order monitor is
    // stopped now rather than on its next read, so it cannot make one more
    // call under the customer who just left.
    await Notifications.instance.stop();
    await Store.signOut();
    if (!mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil('/welcome', (r) => false);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: Brand.gray50,
        body: Center(
          child: CircularProgressIndicator(color: Brand.purple),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Brand.gray50,
      appBar: AppHeader(
        title: 'Profile',
        gradient: true,
        action: IconButton(
          icon: const Icon(Icons.notifications_none, color: Colors.white),
          onPressed: () => Navigator.of(context).pushNamed('/notifications'),
        ),
      ),
      bottomNavigationBar: const AppBottomNav(current: '/profile'),
      body: RefreshIndicator(
        onRefresh: _load,
        color: Brand.purple,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          children: [
            _identityCard(),
            const SizedBox(height: 20),
            _sectionTitle('My Addresses'),
            for (var i = 0; i < _addresses.length; i++)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _addressCard(i),
              ),
            _linkButton('+ Add New',
                () async {
              await Navigator.of(context).pushNamed('/add-address');
              await _load();
            }),
            const SizedBox(height: 20),
            _sectionTitle('Payment Options'),
            for (var i = 0; i < _payments.length; i++)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _paymentCard(i),
              ),
            if (!_hasEveryPaymentType)
              _linkButton('+ Add Payment', () => _paymentSheet())
            else
              const Text('All payment methods added',
                  style: TextStyle(color: Brand.mutedForeground, fontSize: 13.5)),
            const SizedBox(height: 20),
            _sectionTitle('Wallet'),
            _tile(
              icon: Icons.account_balance_wallet_outlined,
              label: 'Balance: ${rupees(_walletBalance)}',
              gradientLabel: true,
              onTap: () => Navigator.of(context).pushNamed('/wallet'),
            ),
            const SizedBox(height: 20),
            _sectionTitle('My Wallet Plans'),
            _tile(
              icon: Icons.credit_card,
              label: 'View My Wallet Plans',
              onTap: () => Navigator.of(context).pushNamed('/my-subscription'),
            ),
            const SizedBox(height: 20),
            _sectionTitle('Refer and Earn'),
            _tile(
              icon: Icons.card_giftcard,
              label: 'Refer a friend, earn wallet credit',
              onTap: () => Navigator.of(context).pushNamed('/refer-earn'),
            ),
            const SizedBox(height: 20),
            _sectionTitle('Support'),
            _tile(
              icon: Icons.mail_outline,
              label: 'Mail',
              onTap: () async {
                final messenger = ScaffoldMessenger.of(context);
                final uri = Uri.parse('mailto:support@urbansteam.in');
                try {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                } catch (_) {
                  messenger.showSnackBar(const SnackBar(
                    content: Text('No mail app found.'),
                    backgroundColor: Brand.destructive,
                    behavior: SnackBarBehavior.floating,
                  ));
                }
              },
            ),
            const SizedBox(height: 20),
            _sectionTitle('App Settings / Legal'),
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: _cardDecoration,
              child: Row(
                children: [
                  const Icon(Icons.notifications_none,
                      size: 16, color: Brand.blue500),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text('Notification',
                        style: TextStyle(
                            fontSize: 14, fontWeight: FontWeight.w500)),
                  ),
                  Switch(
                    value: _notificationsOn,
                    activeThumbColor: Colors.white,
                    activeTrackColor: Brand.purple,
                    onChanged: (on) async {
                      setState(() => _notificationsOn = on);
                      await Store.setString(
                          'notificationsEnabled', on ? 'true' : 'false');
                      if (on) {
                        await Notifications.instance.start();
                      } else {
                        await Notifications.instance.stop();
                      }
                    },
                  ),
                ],
              ),
            ),
            _tile(
              icon: Icons.description_outlined,
              label: 'Privacy Policy',
              onTap: () => Navigator.of(context).pushNamed('/privacy-policy'),
            ),
            const SizedBox(height: 12),
            _tile(
              icon: Icons.description_outlined,
              label: 'Terms & Conditions',
              onTap: () => Navigator.of(context).pushNamed('/terms-conditions'),
            ),
            const SizedBox(height: 22),
            SizedBox(
              height: 40, // h-10
              child: ElevatedButton.icon(
                onPressed: _logout,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFDC2626),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16)),
                ),
                icon: const Icon(Icons.logout, size: 16), // w-4 h-4
                label: const Text('Logout',
                    style: TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w600)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static final _cardDecoration = BoxDecoration(
    color: Colors.white,
    borderRadius: BorderRadius.circular(16),
    boxShadow: const [
      BoxShadow(color: Color(0x14000000), blurRadius: 12, offset: Offset(0, 4)),
    ],
  );

  Widget _sectionTitle(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: GradientText(
          text,
          style: const TextStyle(
            fontFamily: 'Montserrat',
            fontSize: 16, // text-base
            fontWeight: FontWeight.w700,
          ),
        ),
      );

  Widget _linkButton(String label, VoidCallback onTap) => Align(
        alignment: Alignment.centerLeft,
        child: GestureDetector(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: GradientText(
              label,
              style: const TextStyle(
                  fontSize: 12, fontWeight: FontWeight.w600), // text-xs
            ),
          ),
        ),
      );

  Widget _identityCard() {
    final profile = _profile;
    final name = (profile?.name.isNotEmpty == true) ? profile!.name : 'User';
    final address = profile?.defaultAddress;

    return Container(
      padding: const EdgeInsets.all(16), // p-4
      decoration: _cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _avatar(name, profile?.profileImage),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontFamily: 'Montserrat',
                        fontSize: 18, // text-lg
                        fontWeight: FontWeight.w700,
                        color: Colors.black,
                      ),
                    ),
                    Text(
                      (profile?.hasRealMobile == true)
                          ? profile!.mobile
                          : '+91 XXXXXXXX',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, color: Brand.gray500),
                    ),
                    Text(
                      (profile?.email.isNotEmpty == true)
                          ? profile!.email
                          : 'Not provided',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, color: Brand.gray500),
                    ),
                    if (address != null)
                      Text(
                        address.oneLine,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 12, color: Brand.blue500),
                      ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          _linkButton('Edit Profile', () async {
            await Navigator.of(context).pushNamed('/edit-profile');
            await _load();
          }),
        ],
      ),
    );
  }

  Widget _avatar(String name, String? image) {
    Widget fallback() => Container(
          height: 48, // w-12 h-12
          width: 48,
          alignment: Alignment.center,
          decoration: const BoxDecoration(
            gradient: Brand.gradient,
            shape: BoxShape.circle,
          ),
          child: Text(
            name.isEmpty ? 'U' : name[0].toUpperCase(),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 18, // text-lg
              fontWeight: FontWeight.w700,
            ),
          ),
        );

    if (image == null || image.isEmpty) return fallback();

    Widget picture;
    if (image.startsWith('data:')) {
      try {
        picture = Image.memory(base64Decode(image.split(',').last),
            fit: BoxFit.cover);
      } catch (_) {
        return fallback();
      }
    } else {
      picture = Image.network(
        absoluteUrl(image) ?? '',
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => fallback(),
      );
    }

    return Container(
      height: 48,
      width: 48,
      clipBehavior: Clip.antiAlias,
      decoration: const BoxDecoration(shape: BoxShape.circle),
      child: picture,
    );
  }

  Widget _addressCard(int index) {
    final address = _addresses[index];
    return Container(
      padding: const EdgeInsets.all(12), // p-3
      decoration: _cardDecoration,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.only(top: 2),
            child: Icon(Icons.location_on_outlined,
                size: 16, color: Brand.blue500),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  address.street.isEmpty ? 'Address' : address.street,
                  style: const TextStyle(
                      fontWeight: FontWeight.w600, fontSize: 14),
                ),
                const SizedBox(height: 1),
                Text(
                  [address.city, address.state]
                          .where((p) => p.isNotEmpty)
                          .join(', ') +
                      (address.pincode.isEmpty ? '' : ' - ${address.pincode}'),
                  style: const TextStyle(fontSize: 12, color: Brand.gray500),
                ),
                if (address.isDefault)
                  const Padding(
                    padding: EdgeInsets.only(top: 3),
                    child: Text('Default',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                          color: Brand.green600,
                        )),
                  ),
              ],
            ),
          ),
          IconButton(
            visualDensity: VisualDensity.compact,
            icon: const Icon(Icons.edit_outlined, size: 19, color: Brand.mutedForeground),
            onPressed: () async {
              await Navigator.of(context).pushNamed(
                '/add-address',
                arguments: {'editIndex': index},
              );
              await _load();
            },
          ),
          IconButton(
            visualDensity: VisualDensity.compact,
            icon:
                const Icon(Icons.delete_outline, size: 19, color: Brand.mutedForeground),
            onPressed: () => _deleteAddress(index),
          ),
        ],
      ),
    );
  }

  Widget _paymentCard(int index) {
    final payment = _payments[index];
    final type = (payment['type'] ?? '').toString();
    final primary = payment['isPrimary'] == true;

    IconData icon;
    switch (type) {
      case 'UPI':
        icon = Icons.smartphone;
        break;
      case 'Card':
        icon = Icons.credit_card;
        break;
      case 'Bank Transfer':
        icon = Icons.account_balance;
        break;
      default:
        icon = Icons.payments_outlined;
    }

    // What is shown under the type. Only ever the last four digits -- the full
    // number is not kept, so there is nothing else to show.
    String detail = '';
    if (type == 'UPI') {
      detail = (payment['upiId'] ?? '').toString();
    } else if (type == 'Card') {
      final holder = (payment['cardHolder'] ?? '').toString();
      final last4 = (payment['cardLast4'] ?? '').toString();
      detail = [holder, if (last4.isNotEmpty) '****$last4'].join(' - ');
    } else if (type == 'Bank Transfer') {
      final bank = (payment['bankName'] ?? '').toString();
      final last4 = (payment['accountLast4'] ?? '').toString();
      detail = [bank, if (last4.isNotEmpty) '****$last4'].join(' - ');
    }
    if (detail.isEmpty) detail = (payment['details'] ?? '').toString();

    return Container(
      padding: const EdgeInsets.all(12), // p-3
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: primary
            ? Border.all(color: const Color(0xFF3B82F6), width: 2)
            : null,
        boxShadow: const [
          BoxShadow(
              color: Color(0x14000000), blurRadius: 12, offset: Offset(0, 4)),
        ],
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: const Color(0xFF3B82F6)),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(type,
                    style: const TextStyle(
                        fontWeight: FontWeight.w500, fontSize: 14)),
                if (detail.isNotEmpty)
                  Text(
                    detail,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12, color: Brand.mutedForeground),
                  ),
              ],
            ),
          ),
          if (primary)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                children: [
                  Icon(Icons.check_circle, size: 12, color: Brand.green600),
                  SizedBox(width: 4),
                  Text('Primary',
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w500,
                        color: Brand.green600,
                      )),
                ],
              ),
            )
          else
            TextButton(
              onPressed: () => _setPrimary(index),
              style: TextButton.styleFrom(
                backgroundColor: const Color(0xFFEFF6FF),
                padding: const EdgeInsets.symmetric(horizontal: 8),
                minimumSize: const Size(0, 30),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: const Text('Set Primary',
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF2563EB),
                  )),
            ),
          IconButton(
            visualDensity: VisualDensity.compact,
            icon: const Icon(Icons.edit_outlined, size: 18, color: Brand.mutedForeground),
            onPressed: () => _paymentSheet(editIndex: index),
          ),
          IconButton(
            visualDensity: VisualDensity.compact,
            icon:
                const Icon(Icons.delete_outline, size: 18, color: Brand.mutedForeground),
            onPressed: () => _deletePayment(index),
          ),
        ],
      ),
    );
  }

  Widget _tile({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    bool gradientLabel = false,
  }) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(12), // p-3
          decoration: _cardDecoration,
          child: Row(
            children: [
              Icon(icon, size: 20, color: const Color(0xFF3B82F6)),
              const SizedBox(width: 12),
              Expanded(
                child: gradientLabel
                    ? GradientText(
                        label,
                        style: const TextStyle(
                            fontSize: 14, fontWeight: FontWeight.w600),
                      )
                    : Text(label,
                        style: const TextStyle(
                            fontSize: 14, fontWeight: FontWeight.w500)),
              ),
              const Icon(Icons.chevron_right, size: 20, color: Brand.mutedForeground),
            ],
          ),
        ),
      ),
    );
  }
}

/// Add or edit a payment method.
///
/// Deliberately different from the web form in one respect: the card number,
/// the account number and the CVV are not stored. The app only ever uses the
/// method's type (and the UPI id) as a hint for the Razorpay sheet, so keeping
/// card secrets in the database bought nothing and broke the app's own privacy
/// policy. Only the last four digits are kept, for the customer to recognise.
class _PaymentSheet extends StatefulWidget {
  const _PaymentSheet({this.existing});

  final Map<String, dynamic>? existing;

  @override
  State<_PaymentSheet> createState() => _PaymentSheetState();
}

class _PaymentSheetState extends State<_PaymentSheet> {
  late String _type = (widget.existing?['type'] ?? 'UPI').toString();

  final _upiId = TextEditingController();
  final _cardNumber = TextEditingController();
  final _cardHolder = TextEditingController();
  final _expiry = TextEditingController();
  final _accountNumber = TextEditingController();
  final _ifsc = TextEditingController();
  final _bankName = TextEditingController();

  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final existing = widget.existing;
    if (existing != null) {
      _upiId.text = (existing['upiId'] ?? '').toString();
      _cardHolder.text = (existing['cardHolder'] ?? '').toString();
      _expiry.text = (existing['expiryDate'] ?? '').toString();
      _bankName.text = (existing['bankName'] ?? '').toString();
      _ifsc.text = (existing['ifscCode'] ?? '').toString();
    }
  }

  @override
  void dispose() {
    _upiId.dispose();
    _cardNumber.dispose();
    _cardHolder.dispose();
    _expiry.dispose();
    _accountNumber.dispose();
    _ifsc.dispose();
    _bankName.dispose();
    super.dispose();
  }

  String? _validate() {
    switch (_type) {
      case 'UPI':
        if (_upiId.text.trim().isEmpty) return 'Please enter your UPI ID.';
        return null;
      case 'Card':
        if (_cardHolder.text.trim().isEmpty) {
          return 'Please enter the card holder name.';
        }
        if (_cardNumber.text.trim().length < 4 &&
            (widget.existing?['cardLast4'] ?? '').toString().isEmpty) {
          return 'Please enter the card number.';
        }
        return null;
      case 'Bank Transfer':
        if (_accountNumber.text.trim().length < 4 &&
            (widget.existing?['accountLast4'] ?? '').toString().isEmpty) {
          return 'Please enter the account number.';
        }
        if (_ifsc.text.trim().isEmpty) return 'Please enter the IFSC code.';
        return null;
    }
    return null;
  }

  String _last4(String value, String fallback) {
    final digits = value.replaceAll(RegExp(r'\D'), '');
    if (digits.length >= 4) return digits.substring(digits.length - 4);
    return fallback;
  }

  void _save() {
    final problem = _validate();
    if (problem != null) {
      showToast(context, problem, error: true);
      return;
    }
    setState(() => _saving = true);

    final payload = <String, dynamic>{
      'type': _type,
      'addedAt': DateTime.now().toIso8601String(),
    };

    if (_type == 'UPI') {
      payload['upiId'] = _upiId.text.trim();
    } else if (_type == 'Card') {
      payload['cardHolder'] = _cardHolder.text.trim();
      payload['expiryDate'] = _expiry.text.trim();
      payload['cardLast4'] = _last4(
        _cardNumber.text,
        (widget.existing?['cardLast4'] ?? '').toString(),
      );
    } else if (_type == 'Bank Transfer') {
      payload['bankName'] = _bankName.text.trim();
      payload['ifscCode'] = _ifsc.text.trim().toUpperCase();
      payload['accountLast4'] = _last4(
        _accountNumber.text,
        (widget.existing?['accountLast4'] ?? '').toString(),
      );
    }

    Navigator.of(context).pop(payload);
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: 20 + MediaQuery.of(context).viewInsets.bottom,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                '${widget.existing == null ? 'Add' : 'Edit'} Payment Method',
                style: const TextStyle(
                  fontFamily: 'Montserrat',
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 16),
              const Text('Payment Type',
                  style: TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w500)),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                initialValue: _type,
                decoration: InputDecoration(
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide:
                        const BorderSide(color: Color(0xFFD1D5DB), width: 2),
                  ),
                ),
                items: const [
                  DropdownMenuItem(value: 'UPI', child: Text('UPI')),
                  DropdownMenuItem(value: 'Card', child: Text('Card')),
                  DropdownMenuItem(
                      value: 'Bank Transfer', child: Text('Bank Transfer')),
                ],
                onChanged: (value) =>
                    setState(() => _type = value ?? _type),
              ),
              const SizedBox(height: 14),
              if (_type == 'UPI')
                _field(_upiId, 'UPI ID', hint: 'example@upi')
              else if (_type == 'Card') ...[
                _field(
                  _cardNumber,
                  'Card Number',
                  hint: (widget.existing?['cardLast4'] ?? '').toString().isEmpty
                      ? '1234 5678 9012 3456'
                      : 'Ends ****${widget.existing!['cardLast4']}',
                  keyboard: TextInputType.number,
                  formatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(19),
                  ],
                ),
                _field(_cardHolder, 'Card Holder Name'),
                _field(_expiry, 'Expiry Date', hint: 'MM/YY'),
                const Padding(
                  padding: EdgeInsets.only(bottom: 8),
                  child: Text(
                    'Only the last four digits are saved, so you can recognise '
                    'the card. The number and CVV are never stored.',
                    style: TextStyle(fontSize: 11.5, color: Brand.mutedForeground, height: 1.5),
                  ),
                ),
              ] else ...[
                _field(
                  _accountNumber,
                  'Account Number',
                  hint: (widget.existing?['accountLast4'] ?? '')
                          .toString()
                          .isEmpty
                      ? ''
                      : 'Ends ****${widget.existing!['accountLast4']}',
                  keyboard: TextInputType.number,
                  formatters: [FilteringTextInputFormatter.digitsOnly],
                ),
                _field(_ifsc, 'IFSC Code'),
                _field(_bankName, 'Bank Name'),
                const Padding(
                  padding: EdgeInsets.only(bottom: 8),
                  child: Text(
                    'Only the last four digits of the account number are saved.',
                    style: TextStyle(
                        fontSize: 11.5, color: Brand.mutedForeground, height: 1.5),
                  ),
                ),
              ],
              const SizedBox(height: 6),
              Row(
                children: [
                  Expanded(
                    child: SizedBox(
                      height: 46,
                      child: OutlinedButton(
                        onPressed: () => Navigator.of(context).pop(),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFFD1D5DB)),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('Cancel',
                            style: TextStyle(color: Brand.gray600)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: GradientButton(
                      label: widget.existing == null ? 'Add' : 'Update',
                      busy: _saving,
                      height: 46,
                      radius: 12,
                      onPressed: _saving ? null : _save,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _field(
    TextEditingController controller,
    String label, {
    String? hint,
    TextInputType? keyboard,
    List<TextInputFormatter>? formatters,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style:
                  const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
          const SizedBox(height: 6),
          TextField(
            controller: controller,
            keyboardType: keyboard,
            inputFormatters: formatters,
            decoration: InputDecoration(
              hintText: hint,
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide:
                    const BorderSide(color: Color(0xFFD1D5DB), width: 2),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
