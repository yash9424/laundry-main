import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../content/legal.dart';
import '../services/api.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/common.dart';
import '../widgets/legal_body.dart';
import '../widgets/photo_picker.dart';

/// customer/src/pages/CreateProfile.tsx
class CreateProfileScreen extends StatefulWidget {
  const CreateProfileScreen({super.key, this.customerId, this.mobileNumber});

  final String? customerId;
  final String? mobileNumber;

  @override
  State<CreateProfileScreen> createState() => _CreateProfileScreenState();
}

class _CreateProfileScreenState extends State<CreateProfileScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _referral = TextEditingController();

  bool _agreed = false;
  bool _termsError = false;
  bool _saving = false;

  /// Stored as a base64 data URL, which is what the server and every other
  /// screen expect for images.
  String? _profileImage;

  String? get _id => widget.customerId ?? Store.customerId;

  @override
  void initState() {
    super.initState();
    _prefill();
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    _referral.dispose();
    super.dispose();
  }

  Future<void> _prefill() async {
    final id = _id;
    if (id == null) {
      if (mounted) {
        Navigator.of(context).pushNamedAndRemoveUntil('/login', (r) => false);
      }
      return;
    }
    final result = await Api.profile(id, timeout: const Duration(seconds: 5));
    if (!mounted || !result.ok) return;
    final mobile = result.map['mobile']?.toString() ?? '';
    // A Google or Apple signup carries a placeholder mobile (google_<sub>);
    // there is nothing useful to show the person in that case.
    if (!mobile.startsWith('google_') && !mobile.startsWith('apple_')) {
      _phone.text = mobile;
    } else if (widget.mobileNumber != null) {
      _phone.text = widget.mobileNumber!;
    }
    setState(() {});
  }

  Future<void> _pick() async {
    final picked = await pickProfilePhoto(context);
    if (picked == null || !mounted) return;
    setState(() => _profileImage = picked);
  }

  void _showTerms() {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => Dialog(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(16), // p-4
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(Brand.rLg)),
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.8, // max-h-[80vh]
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 8, 12),
                child: Row(
                  children: [
                    const Expanded(
                      child: Text(
                        'Terms and Conditions',
                        style: TextStyle(
                          fontFamily: Brand.heading,
                          fontSize: 18, // text-lg
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 20),
                      onPressed: () => Navigator.of(dialogContext).pop(),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1, color: Brand.border),
              const Expanded(
                child: SingleChildScrollView(
                  child: LegalBody(sections: termsSections),
                ),
              ),
              const Divider(height: 1, color: Brand.border),
              Padding(
                padding: const EdgeInsets.all(16),
                child: GradientButton(
                  label: 'Close',
                  height: 40, // h-10
                  radius: Brand.rXl,
                  fontSize: 14,
                  onPressed: () => Navigator.of(dialogContext).pop(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _save() async {
    if (_saving) return;
    setState(() => _termsError = false);

    if (_name.text.trim().isEmpty) {
      showToast(context, 'Please enter your full name.', error: true);
      return;
    }
    if (_email.text.trim().isEmpty) {
      showToast(context, 'Please enter your email address.', error: true);
      return;
    }
    if (_phone.text.trim().isEmpty) {
      showToast(context, 'Please enter your mobile number.', error: true);
      return;
    }
    if (!_agreed) {
      setState(() => _termsError = true);
      showToast(
        context,
        'You must agree to the Terms and Conditions to create your profile.',
        error: true,
      );
      return;
    }

    final id = _id;
    if (id == null) {
      Navigator.of(context).pushNamedAndRemoveUntil('/login', (r) => false);
      return;
    }

    setState(() => _saving = true);
    final result = await Api.saveProfile(id, {
      'name': _name.text.trim(),
      'email': _email.text.trim(),
      'mobile': _phone.text.trim(),
      if (_profileImage != null) 'profileImage': _profileImage,
      if (_referral.text.trim().isNotEmpty) 'referredBy': _referral.text.trim(),
    });

    if (!mounted) return;
    if (result.ok) {
      await Store.setString(Store.kCustomerId, id);
      await Store.setUserName(_name.text.trim());
      if (!mounted) return;
      Navigator.of(context).pushNamedAndRemoveUntil('/home', (r) => false);
    } else {
      setState(() => _saving = false);
      showToast(
        context,
        'Failed to save profile: ${result.error ?? 'Unknown error'}',
        error: true,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final complete = _name.text.isNotEmpty &&
        _email.text.isNotEmpty &&
        _phone.text.isNotEmpty &&
        _agreed;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: const PageHeader('Create Profile'),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32), // px-4 py-4
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: AvatarPicker(dataUrl: _profileImage, onTap: _pick),
              ),
              const SizedBox(height: 16), // mb-4
              _field(_name, 'Full Name'),
              const SizedBox(height: 12), // space-y-3
              _field(_email, 'Email Address',
                  keyboard: TextInputType.emailAddress),
              const SizedBox(height: 12),
              _field(_phone, 'Mobile Number',
                  keyboard: TextInputType.number,
                  formatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(10),
                  ]),
              const SizedBox(height: 12),
              // The referral box is the only one with a grey border.
              SizedBox(
                height: 40,
                child: TextField(
                  controller: _referral,
                  textCapitalization: TextCapitalization.characters,
                  style: const TextStyle(fontSize: 14),
                  decoration: InputDecoration(
                    hintText: 'Referral Code (Optional)',
                    isDense: false,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(Brand.rXl),
                      borderSide:
                          const BorderSide(color: Brand.gray300, width: 2),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(Brand.rXl),
                      borderSide:
                          const BorderSide(color: Brand.gray300, width: 2),
                    ),
                  ),
                  onChanged: (v) {
                    final upper = v.toUpperCase();
                    if (upper != v) {
                      _referral.value = TextEditingValue(
                        text: upper,
                        selection:
                            TextSelection.collapsed(offset: upper.length),
                      );
                    }
                  },
                ),
              ),
              const SizedBox(height: 16), // mt-4
              Container(
                padding: const EdgeInsets.all(12), // p-3
                decoration: BoxDecoration(
                  color: _termsError ? const Color(0xFFFEF2F2) : null,
                  borderRadius: BorderRadius.circular(Brand.rLg),
                  border: _termsError
                      ? Border.all(color: const Color(0xFFFECACA))
                      : null,
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    GestureDetector(
                      onTap: () => setState(() {
                        _agreed = !_agreed;
                        _termsError = false;
                      }),
                      child: Container(
                        height: 20, // w-5 h-5
                        width: 20,
                        margin: const EdgeInsets.only(top: 4), // mt-1
                        decoration: BoxDecoration(
                          color: _agreed ? Brand.blue500 : Colors.white,
                          borderRadius: BorderRadius.circular(4), // rounded
                          border: Border.all(
                            color: _agreed
                                ? Brand.blue500
                                : _termsError
                                    ? Brand.red500
                                    : Brand.gray300,
                            width: 2,
                          ),
                        ),
                        child: _agreed
                            ? const Center(
                                child: Text(
                                  '✓',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    height: 1,
                                  ),
                                ),
                              )
                            : null,
                      ),
                    ),
                    const SizedBox(width: 12), // gap-3
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Wrap(
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              Text(
                                'I agree with all ',
                                style: TextStyle(
                                  fontSize: 14, // text-sm
                                  color: _termsError
                                      ? const Color(0xFFB91C1C)
                                      : Brand.gray700,
                                ),
                              ),
                              GestureDetector(
                                onTap: _showTerms,
                                child: const Text(
                                  'terms and conditions',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Brand.blue500,
                                    fontWeight: FontWeight.w500,
                                    decoration: TextDecoration.underline,
                                    decorationColor: Brand.blue500,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          if (_termsError)
                            const Padding(
                              padding: EdgeInsets.only(top: 4),
                              child: Text(
                                '⚠ You must agree to the terms and conditions',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Brand.red600,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16), // mt-4
              GradientButton(
                label: _saving ? 'Saving...' : 'Save & Continue',
                busy: _saving,
                height: 40, // h-10
                radius: Brand.rXl, // rounded-xl
                fontSize: 14, // text-sm
                // This screen sets a flat #9ca3af inline rather than fading.
                disabledLook: DisabledLook.flatGrey,
                onPressed: complete && !_saving ? _save : null,
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// `h-10 rounded-xl border-2 border-blue-500 text-sm` with `pl-10` left
  /// padding. The web screen also places an icon in that gap, but the input's
  /// own white background paints over it, so nothing is actually visible --
  /// the padding is reproduced, the invisible icon is not.
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
          contentPadding: const EdgeInsets.only(left: 40, right: 12, top: 10, bottom: 10), // pl-10
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
