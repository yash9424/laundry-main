import 'package:flutter/material.dart';

import '../services/api.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/common.dart';
import '../widgets/photo_picker.dart';

/// `app/profile/page.tsx` -- the captain's own details, the three sections
/// under them, and sign out.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String _name = '';
  String _mobile = '';
  String _kycStatus = 'pending';
  String _profileImage = '';
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final partnerId = Store.partnerId;
    if (partnerId == null) {
      if (mounted) {
        Navigator.of(context).pushNamedAndRemoveUntil('/login', (r) => false);
      }
      return;
    }

    final result = await Api.partner(partnerId);
    if (!mounted) return;
    setState(() {
      if (result.ok) {
        final data = result.map;
        _name = (data['name'] ?? '').toString();
        _mobile = (data['mobile'] ?? '').toString();
        _kycStatus = (data['kycStatus'] ?? 'pending').toString();
        _profileImage = (data['profileImage'] ?? '').toString();
      }
      _loading = false;
    });
  }

  Future<void> _changePhoto() async {
    final picked = await pickImageAsDataUrl(context);
    final partnerId = Store.partnerId;
    if (picked == null || partnerId == null || !mounted) return;

    final result = await Api.updatePartner(partnerId, {'profileImage': picked});
    if (!mounted) return;
    if (result.ok) {
      await _load();
    } else {
      showToast(context, 'Failed to update profile image',
          kind: ToastKind.error);
    }
  }

  Future<void> _logout() async {
    // Everything belonging to this captain goes, not just the id and token, so
    // the next person to sign in on this phone cannot inherit their data.
    // Store.signOut also pushes onto authChanges, which stops the order
    // monitor now rather than on its next tick.
    await Store.signOut();
    if (!mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil('/', (r) => false);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: Brand.gray50,
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                height: 48,
                width: 48,
                child: CircularProgressIndicator(
                    strokeWidth: 4, color: Color(0xFFE0D4F7)),
              ),
              SizedBox(height: 16),
              Text('Loading...', style: TextStyle(color: Brand.gray500)),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Brand.gray50,
      bottomNavigationBar: const PartnerBottomNav(current: NavTab.profile),
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            InkWell(
              onTap: () => Navigator.of(context).maybePop(),
              child: const Padding(
                padding: EdgeInsets.only(bottom: 16),
                child: Row(
                  children: [
                    Icon(Icons.chevron_left, size: 24, color: Brand.gray600),
                    SizedBox(width: 8),
                    Text('Back',
                        style: TextStyle(
                            fontWeight: FontWeight.w600, color: Brand.gray600)),
                  ],
                ),
              ),
            ),
            _headerCard(),
            const SizedBox(height: 16),
            _row(
              icon: Icons.person_outline,
              iconColor: Brand.purple,
              iconBackground: const Color(0xFFF0EBF8),
              title: 'Personal Details',
              subtitle: 'View and edit your personal information',
              onTap: () async {
                await Navigator.of(context).pushNamed('/profile/personal');
                if (mounted) _load();
              },
            ),
            const SizedBox(height: 16),
            _row(
              // The web icon is a tick inside a plain circle, not a
              // scalloped verification badge.
              icon: Icons.check_circle_outline,
              iconColor: Brand.green600,
              iconBackground: const Color(0xFFDCFCE7),
              title: 'KYC Details',
              subtitle: 'Verification documents and status',
              trailing: _statusChip(_kycStatus),
              onTap: () async {
                await Navigator.of(context).pushNamed('/profile/kyc-details');
                if (mounted) _load();
              },
            ),
            const SizedBox(height: 16),
            _row(
              icon: Icons.credit_card,
              iconColor: const Color(0xFF9333EA),
              iconBackground: const Color(0xFFF3E8FF),
              title: 'Bank Details',
              subtitle: 'Manage your bank account information',
              onTap: () => Navigator.of(context).pushNamed('/profile/bank'),
            ),
            const SizedBox(height: 16),
            SizedBox(
              // py-3 with no text class: a button's 12px against the inherited
              // 1.5 line-height.
              height: 42,
              child: ElevatedButton.icon(
                onPressed: _logout,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Brand.red600,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(Brand.rLg),
                  ),
                ),
                icon: const Icon(Icons.logout, size: 20),
                label: const Text(
                  'Logout',
                  style: TextStyle(
                      fontFamily: Brand.heading, fontWeight: FontWeight.w500),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _headerCard() {
    final provider = imageProviderFor(_profileImage);
    return Container(
      padding: const EdgeInsets.all(24), // p-6
      decoration: BoxDecoration(
        color: Brand.surface,
        borderRadius: BorderRadius.circular(Brand.rLg),
        boxShadow: const [
          BoxShadow(
              color: Color(0x14000000), blurRadius: 8, offset: Offset(0, 2)),
        ],
      ),
      child: Row(
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                height: 80,
                width: 80,
                decoration: BoxDecoration(
                  color: const Color(0xFFF0EBF8),
                  shape: BoxShape.circle,
                  border: provider == null
                      ? null
                      : Border.all(color: Brand.purple, width: 2),
                  image: provider == null
                      ? null
                      : DecorationImage(image: provider, fit: BoxFit.cover),
                ),
                child: provider != null
                    ? null
                    : Center(
                        child: Text(
                          _name.isEmpty ? 'P' : _name[0].toUpperCase(),
                          style: const TextStyle(
                            fontFamily: Brand.heading,
                            fontSize: 30,
                            fontWeight: FontWeight.bold,
                            color: Brand.purple,
                          ),
                        ),
                      ),
              ),
              Positioned(
                bottom: 0,
                right: 0,
                child: GestureDetector(
                  onTap: _changePhoto,
                  child: Container(
                    height: 24,
                    width: 24,
                    decoration: const BoxDecoration(
                      color: Brand.purple,
                      shape: BoxShape.circle,
                    ),
                    child: const Center(
                      child: Text('\u{1F4F7}', style: TextStyle(fontSize: 11)),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _name.isEmpty ? 'Partner' : _name,
                  style: const TextStyle(
                    fontFamily: Brand.heading,
                    fontSize: Brand.h1, // <h1>
                    fontWeight: FontWeight.w700,
                    color: Brand.gray900,
                  ),
                ),
                Text(
                  _mobile.isEmpty ? 'No mobile' : _mobile,
                  style: const TextStyle(color: Brand.gray600),
                ),
                const SizedBox(height: 4),
                _statusChip(_kycStatus, prefix: 'KYC: '),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _statusChip(String status, {String prefix = ''}) {
    final (background, foreground) = status == 'approved'
        ? (const Color(0xFFDCFCE7), const Color(0xFF166534))
        : status == 'rejected'
            ? (const Color(0xFFFEE2E2), const Color(0xFF991B1B))
            : (const Color(0xFFFEF9C3), const Color(0xFF854D0E));

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        '$prefix${status.toUpperCase()}',
        style: TextStyle(
          fontSize: 12,
          height: Brand.leadXs,
          fontWeight: FontWeight.w500,
          color: foreground,
        ),
      ),
    );
  }

  Widget _row({
    required IconData icon,
    required Color iconColor,
    required Color iconBackground,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    Widget? trailing,
  }) {
    return Material(
      color: Brand.surface,
      borderRadius: BorderRadius.circular(Brand.rLg),
      elevation: 1,
      shadowColor: Colors.black12,
      child: InkWell(
        borderRadius: BorderRadius.circular(Brand.rLg),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(24), // p-6
          child: Row(
            children: [
              Container(
                height: 48,
                width: 48,
                decoration: BoxDecoration(
                  color: iconBackground,
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, size: 24, color: iconColor),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontFamily: Brand.heading,
                        fontSize: Brand.h3, // <h3>
                        fontWeight: FontWeight.w500,
                        color: Brand.gray900,
                      ),
                    ),
                    Text(
                      subtitle,
                      style: const TextStyle(
                          fontSize: 14,
                          height: Brand.leadSm,
                          color: Brand.gray500),
                    ),
                  ],
                ),
              ),
              // gap-4 between every pair, including the chip and the
              // chevron -- it is what squeezes the subtitle onto three lines
              // on the KYC row.
              if (trailing != null) ...[
                const SizedBox(width: 16),
                trailing,
              ],
              const SizedBox(width: 16),
              const Icon(Icons.chevron_right, size: 24, color: Brand.gray400),
            ],
          ),
        ),
      ),
    );
  }
}
