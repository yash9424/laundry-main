import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../models/catalogue.dart';
import '../services/api.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/common.dart';
import '../widgets/photo_picker.dart';

/// customer/src/pages/EditProfile.tsx -- Create Profile without the terms box
/// or the referral field, behind the shared white header.
class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();

  String? _photo;
  bool _saving = false;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    super.dispose();
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
    if (result.ok) {
      final customer = result.map;
      _name.text = (customer['name'] ?? '').toString();
      _email.text = (customer['email'] ?? '').toString();
      final mobile = (customer['mobile'] ?? '').toString();
      _phone.text =
          (mobile.startsWith('google_') || mobile.startsWith('apple_'))
              ? ''
              : mobile;
      final image = customer['profileImage']?.toString();
      _photo = (image == null || image.isEmpty)
          ? null
          : (image.startsWith('data:') ? image : absoluteUrl(image));
    }
    setState(() => _loading = false);
  }

  Future<void> _pick() async {
    final picked = await pickProfilePhoto(context);
    if (picked == null || !mounted) return;
    setState(() => _photo = picked);
  }

  Future<void> _save() async {
    if (_saving) return;
    final customerId = Store.customerId;
    if (customerId == null) return;

    setState(() => _saving = true);
    final result = await Api.saveProfile(customerId, {
      'name': _name.text.trim(),
      'email': _email.text.trim(),
      'mobile': _phone.text.trim(),
      // Only send a photo the customer actually chose this time; sending the
      // remote URL back would overwrite the stored image with a link to itself.
      if (_photo != null && _photo!.startsWith('data:')) 'profileImage': _photo,
    });

    if (!mounted) return;
    setState(() => _saving = false);

    if (result.ok) {
      await Store.setUserName(_name.text.trim());
      if (!mounted) return;
      Navigator.of(context).pop();
    } else {
      showToast(
        context,
        'Failed to update profile: ${result.error ?? 'Unknown error'}',
        error: true,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final complete = _name.text.isNotEmpty &&
        _email.text.isNotEmpty &&
        _phone.text.isNotEmpty;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: const AppHeader(title: 'Edit Profile'),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: AvatarPicker(
                        dataUrl: _photo,
                        onTap: _pick,
                        caption: 'Tap to change photo',
                      ),
                    ),
                    const SizedBox(height: 16),
                    _field(_name, 'Full Name'),
                    const SizedBox(height: 12),
                    _field(_email, 'Email Address',
                        keyboard: TextInputType.emailAddress),
                    const SizedBox(height: 12),
                    _field(_phone, 'Mobile Number',
                        keyboard: TextInputType.number,
                        formatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(10),
                        ]),
                    const SizedBox(height: 24), // mt-6
                    GradientButton(
                      label: _saving ? 'Updating...' : 'Update Profile',
                      busy: _saving,
                      height: 40,
                      radius: Brand.rXl,
                      fontSize: 14,
                      disabledLook: DisabledLook.flatGrey,
                      onPressed: complete && !_saving ? _save : null,
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _field(
    TextEditingController controller,
    String hint, {
    TextInputType? keyboard,
    List<TextInputFormatter>? formatters,
  }) {
    return SizedBox(
      height: 40,
      child: TextField(
        controller: controller,
        keyboardType: keyboard,
        inputFormatters: formatters,
        style: const TextStyle(fontSize: 14),
        onChanged: (_) => setState(() {}),
        decoration: InputDecoration(
          hintText: hint,
          counterText: '',
          isDense: false,
          contentPadding: const EdgeInsets.only(left: 40, right: 12, top: 10, bottom: 10),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(Brand.rXl),
            borderSide: const BorderSide(color: Brand.blue500, width: 2),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(Brand.rXl),
            borderSide: const BorderSide(color: Brand.blue500, width: 2),
          ),
        ),
      ),
    );
  }
}
