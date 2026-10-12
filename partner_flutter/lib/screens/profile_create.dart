import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/api.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/common.dart';
import '../widgets/photo_picker.dart';

/// `app/profile/create/page.tsx`.
///
/// Name, email, mobile, a photo, and the pincodes the captain will work. The
/// pincode list is the part that matters: it is what decides which orders ever
/// reach them, and the screen refuses to save without at least one complete
/// six-digit entry.
class ProfileCreateScreen extends StatefulWidget {
  const ProfileCreateScreen({super.key});

  @override
  State<ProfileCreateScreen> createState() => _ProfileCreateScreenState();
}

class _ProfileCreateScreenState extends State<ProfileCreateScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _mobile = TextEditingController();
  final List<TextEditingController> _pincodes = [TextEditingController()];

  String? _photo;
  bool _loading = false;

  // Carried through the save untouched, so creating a profile does not wipe
  // details the admin or an earlier session already filled in.
  Map<String, dynamic> _address = const {};
  String _vehicleType = '';
  String _vehicleNumber = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _mobile.dispose();
    for (final c in _pincodes) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    final partnerId = Store.partnerId;
    if (partnerId == null) {
      if (mounted) {
        Navigator.of(context).pushNamedAndRemoveUntil('/login', (r) => false);
      }
      return;
    }

    final result = await Api.partnerByQuery(partnerId);
    if (!mounted || !result.ok) return;
    final partner = result.map;

    // A Google sign-up has no real number yet -- the server stores a
    // `google_<sub>` placeholder, which must not be shown as a phone number.
    final mobile = (partner['mobile'] ?? '').toString();
    final isGoogle = mobile.startsWith('google_');

    setState(() {
      _name.text = (partner['name'] ?? '').toString();
      _email.text = (partner['email'] ?? '').toString();
      _mobile.text = isGoogle ? '' : mobile;
      _photo = (partner['profileImage'] ?? '').toString().isEmpty
          ? null
          : partner['profileImage'].toString();
      _address = partner['address'] is Map
          ? Map<String, dynamic>.from(partner['address'] as Map)
          : const {};
      _vehicleType = (partner['vehicleType'] ?? '').toString();
      _vehicleNumber = (partner['vehicleNumber'] ?? '').toString();

      final existing = (partner['pincodes'] is List)
          ? (partner['pincodes'] as List).map((p) => p.toString()).toList()
          : <String>[];
      for (final c in _pincodes) {
        c.dispose();
      }
      _pincodes
        ..clear()
        ..addAll(existing.isEmpty
            ? [TextEditingController()]
            : existing.map((p) => TextEditingController(text: p)));
    });
  }

  Future<void> _pickPhoto() async {
    final picked = await pickImageAsDataUrl(context);
    if (picked == null || !mounted) return;
    setState(() => _photo = picked);
  }

  Future<void> _save() async {
    if (_name.text.trim().isEmpty || _mobile.text.trim().isEmpty) {
      showToast(context, 'Please fill required fields', kind: ToastKind.error);
      return;
    }
    final valid = _pincodes
        .map((c) => c.text.trim())
        .where((p) => p.length == 6)
        .toList();
    if (valid.isEmpty) {
      showToast(context, 'Please add at least one valid 6-digit pincode',
          kind: ToastKind.error);
      return;
    }

    setState(() => _loading = true);
    final partnerId = Store.partnerId;
    final result = await Api.putPartner(partnerId!, {
      'name': _name.text.trim(),
      'email': _email.text.trim(),
      'mobile': _mobile.text.trim(),
      if (_photo != null) 'profileImage': _photo,
      'address': _address,
      'pincodes': valid,
      'vehicleType': _vehicleType,
      'vehicleNumber': _vehicleNumber,
    });

    if (!mounted) return;
    setState(() => _loading = false);

    if (result.ok) {
      Navigator.of(context)
          .pushNamedAndRemoveUntil('/profile/kyc', (r) => false);
    } else {
      showToast(context, result.error ?? 'Failed to save profile',
          kind: ToastKind.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppHeader(
        title: 'Create Profile',
        onBack: () => Navigator.of(context).pop(),
        trailing: GestureDetector(
          onTap: _loading ? null : _save,
          child: Align(
            alignment: Alignment.centerRight,
            child: Text(
              _loading ? 'Saving...' : 'Save',
              style: TextStyle(
                fontFamily: Brand.heading,
                fontWeight: FontWeight.w600,
                fontSize: 12,
                color: _loading ? Brand.gray400 : Brand.purple,
              ),
            ),
          ),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.only(bottom: 96), // pb-24
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 24), // pt-6
              Center(child: AvatarPicker(dataUrl: _photo, onTap: _pickPhoto)),
              const SizedBox(height: 24), // mt-6
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    BrandField(
                      controller: _name,
                      hint: 'Full Name',
                      glyph: '\u{1F464}',
                    ),
                    const SizedBox(height: 16), // gap-4
                    BrandField(
                      controller: _email,
                      hint: 'Email Address',
                      glyph: '✉️',
                      keyboardType: TextInputType.emailAddress,
                    ),
                    const SizedBox(height: 16),
                    BrandField(
                      controller: _mobile,
                      hint: '123-456-7890',
                      glyph: '\u{1F4DE}',
                      keyboardType: TextInputType.phone,
                      maxLength: 10,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        LengthLimitingTextInputFormatter(10),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _pincodeSection(),
                    const SizedBox(height: 20), // mt-5
                    GradientButton(
                      label: _loading ? 'Saving...' : 'Save & Continue',
                      height: 48,
                      radius: Brand.rXl,
                      busy: _loading,
                      onPressed: _loading ? null : _save,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _pincodeSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Service Areas (Pincodes)',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: Brand.gray700,
              ),
            ),
            Material(
              color: const Color(0xFFF3F0FF),
              borderRadius: BorderRadius.circular(Brand.rLg),
              child: InkWell(
                borderRadius: BorderRadius.circular(Brand.rLg),
                onTap: () =>
                    setState(() => _pincodes.add(TextEditingController())),
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  child: Text(
                    '+ Add Pincode',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: Brand.purple,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12), // space-y-3
        for (var i = 0; i < _pincodes.length; i++) ...[
          if (i > 0) const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: BrandField(
                  controller: _pincodes[i],
                  hint: 'Enter 6-digit pincode',
                  glyph: '\u{1F4CD}',
                  fontSize: 14,
                  maxLength: 6,
                  keyboardType: TextInputType.number,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(6),
                  ],
                ),
              ),
              if (_pincodes.length > 1) ...[
                const SizedBox(width: 8), // gap-2
                GestureDetector(
                  onTap: () => setState(() {
                    _pincodes.removeAt(i).dispose();
                  }),
                  child: Container(
                    height: 32,
                    width: 32,
                    decoration: const BoxDecoration(
                      color: Color(0xFFFEE2E2), // red-100
                      shape: BoxShape.circle,
                    ),
                    child: const Center(
                      child: Text(
                        '×',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Brand.red600,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ],
        const SizedBox(height: 4), // mt-1
        const Text(
          'Add all pincodes where you can provide delivery services',
          style: TextStyle(fontSize: 12, color: Brand.gray500),
        ),
      ],
    );
  }
}
