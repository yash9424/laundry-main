import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/api.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/common.dart';
import '../widgets/photo_picker.dart';

/// `app/profile/kyc/page.tsx`.
///
/// Vehicle and document details, then a waiting screen that polls every five
/// seconds until the admin approves or rejects. Approval sends the captain to
/// their pickups; rejection sends them to the details screen, which is the
/// only place that shows the reason.
class ProfileKycScreen extends StatefulWidget {
  const ProfileKycScreen({super.key});

  @override
  State<ProfileKycScreen> createState() => _ProfileKycScreenState();
}

class _ProfileKycScreenState extends State<ProfileKycScreen> {
  final _vehicleNumber = TextEditingController();
  final _aadharNumber = TextEditingController();
  final _licenseNumber = TextEditingController();

  String _vehicleType = '';
  String? _aadharImage;
  String? _licenseImage;

  bool _loading = false;
  bool _submitted = false;
  String _status = 'pending';
  Timer? _poll;

  static const _vehicleTypes = <({String value, String label})>[
    (value: 'bike', label: 'Bike'),
    (value: 'scooter', label: 'Scooter'),
    (value: 'car', label: 'Car'),
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _poll?.cancel();
    _vehicleNumber.dispose();
    _aadharNumber.dispose();
    _licenseNumber.dispose();
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

    final result = await Api.partner(partnerId);
    if (!mounted || !result.ok) return;
    final partner = result.map;

    setState(() {
      _vehicleType = (partner['vehicleType'] ?? '').toString();
      _vehicleNumber.text = (partner['vehicleNumber'] ?? '').toString();
      _aadharNumber.text = (partner['aadharNumber'] ?? '').toString();
      _aadharImage = _orNull(partner['aadharImage']);
      _licenseNumber.text = (partner['drivingLicenseNumber'] ?? '').toString();
      _licenseImage = _orNull(partner['drivingLicenseImage']);
      _status = (partner['kycStatus'] ?? 'pending').toString();
      // Anything other than an untouched "pending" means it has been sent in.
      _submitted = _status.isNotEmpty && _status != 'pending';
    });

    if (_status == 'approved') {
      if (!mounted) return;
      Navigator.of(context).pushNamedAndRemoveUntil('/pickups', (r) => false);
      return;
    }
    if (_submitted) _startPolling();
  }

  static String? _orNull(Object? value) {
    final text = value?.toString() ?? '';
    return text.isEmpty ? null : text;
  }

  void _startPolling() {
    _poll?.cancel();
    _poll = Timer.periodic(const Duration(seconds: 5), (_) async {
      final partnerId = Store.partnerId;
      if (partnerId == null) return;
      final result = await Api.partner(partnerId);
      if (!mounted || !result.ok) return;
      final status = (result.map['kycStatus'] ?? '').toString();
      if (status == 'approved') {
        _poll?.cancel();
        if (!mounted) return;
        Navigator.of(context).pushNamedAndRemoveUntil('/pickups', (r) => false);
      } else if (status == 'rejected') {
        _poll?.cancel();
        if (!mounted) return;
        Navigator.of(context)
            .pushNamedAndRemoveUntil('/profile/kyc-details', (r) => false);
      }
    });
  }

  Future<void> _pick(void Function(String) assign) async {
    final picked = await pickImageAsDataUrl(context);
    if (picked == null || !mounted) return;
    setState(() => assign(picked));
  }

  Future<void> _submit() async {
    if (_vehicleType.isEmpty ||
        _vehicleNumber.text.trim().isEmpty ||
        _aadharNumber.text.trim().isEmpty ||
        _licenseNumber.text.trim().isEmpty) {
      showToast(context, 'Please fill all required fields',
          kind: ToastKind.error);
      return;
    }

    final partnerId = Store.partnerId;
    if (partnerId == null) {
      showToast(context, 'Partner ID not found. Please login again.',
          kind: ToastKind.error);
      return;
    }

    setState(() => _loading = true);
    final result = await Api.submitKyc(partnerId, {
      'vehicleType': _vehicleType,
      'vehicleNumber': _vehicleNumber.text.trim(),
      'aadharNumber': _aadharNumber.text.trim(),
      'aadharImage': _aadharImage ?? '',
      'drivingLicenseNumber': _licenseNumber.text.trim(),
      'drivingLicenseImage': _licenseImage ?? '',
    });

    if (!mounted) return;
    setState(() => _loading = false);

    if (!result.ok) {
      showToast(context, result.error ?? 'Failed to submit KYC',
          kind: ToastKind.error);
      return;
    }

    setState(() {
      _submitted = true;
      _status = (result.map['kycStatus'] ?? 'pending').toString();
    });
    _startPolling();
    showToast(
      context,
      'KYC submitted successfully! Admin will review within 24-48 hours.',
      kind: ToastKind.success,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_submitted) return _waiting();

    return Scaffold(
      backgroundColor: Brand.gray50,
      appBar: AppHeader(
        title: 'KYC Verification',
        onBack: () => Navigator.of(context).maybePop(),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 24, 16, 96),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _label('Vehicle Type *'),
              _vehicleDropdown(),
              const SizedBox(height: 24), // space-y-6
              _label('Vehicle Number *'),
              BrandField(
                controller: _vehicleNumber,
                hint: 'Enter vehicle number',
                inputFormatters: [UpperCaseFormatter()],
              ),
              const SizedBox(height: 24),
              _label('Aadhar Number *'),
              BrandField(
                controller: _aadharNumber,
                hint: 'Enter 12-digit Aadhar number',
                keyboardType: TextInputType.number,
                maxLength: 12,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(12),
                ],
              ),
              const SizedBox(height: 24),
              _label('Aadhar Card Image'),
              _upload(
                image: _aadharImage,
                prompt: '+ Upload Aadhar Card',
                onTap: () => _pick((v) => _aadharImage = v),
              ),
              const SizedBox(height: 24),
              _label('Driving License Number *'),
              BrandField(
                controller: _licenseNumber,
                hint: 'Enter driving license number',
                inputFormatters: [UpperCaseFormatter()],
              ),
              const SizedBox(height: 24),
              _label('Driving License Image'),
              _upload(
                image: _licenseImage,
                prompt: '+ Upload Driving License',
                onTap: () => _pick((v) => _licenseImage = v),
              ),
              const SizedBox(height: 24),
              GradientButton(
                label: _loading ? 'Submitting...' : 'Submit KYC',
                height: 42, // py-3 around text-base at 12px
                radius: Brand.rXl,
                busy: _loading,
                onPressed: _loading ? null : _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 8), // mb-2
        child: Text(
          text,
          style: const TextStyle(
            fontSize: 14,
            height: Brand.leadSm,
            fontWeight: FontWeight.w500,
            color: Brand.gray700,
          ),
        ),
      );

  Widget _vehicleDropdown() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(Brand.rXl),
        border: Border.all(color: Brand.inputBorder, width: 2),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          isExpanded: true,
          value: _vehicleType.isEmpty ? null : _vehicleType,
          hint: const Text('Select Vehicle Type',
              style: TextStyle(
                  fontSize: 16, height: Brand.leadBase, color: Brand.gray400)),
          style: const TextStyle(
              fontSize: 16, height: Brand.leadBase, color: Colors.black),
          padding: const EdgeInsets.symmetric(vertical: 6),
          items: [
            for (final type in _vehicleTypes)
              DropdownMenuItem(value: type.value, child: Text(type.label)),
          ],
          onChanged: (value) => setState(() => _vehicleType = value ?? ''),
        ),
      ),
    );
  }

  /// `h-32 border-2 border-dashed rounded-xl`.
  Widget _upload({
    required String? image,
    required String prompt,
    required VoidCallback onTap,
  }) {
    final provider = imageProviderFor(image);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 128,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(Brand.rXl),
        ),
        child: CustomPaint(
          painter: const DashedBorderPainter(
            color: Brand.inputBorder,
            radius: Brand.rXl,
            strokeWidth: 2,
          ),
          child: Center(
            child: provider == null
                ? Text(prompt, style: const TextStyle(color: Brand.purple))
                : Padding(
                    padding: const EdgeInsets.all(8),
                    child: Image(
                        image: provider, height: 112, fit: BoxFit.contain),
                  ),
          ),
        ),
      ),
    );
  }

  /// The "under review" card the screen turns into once KYC is in.
  Widget _waiting() {
    return Scaffold(
      backgroundColor: Brand.gray50,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 384), // max-w-sm
              child: Container(
                padding: const EdgeInsets.all(32), // p-8
                decoration: BoxDecoration(
                  color: Brand.surface,
                  borderRadius: BorderRadius.circular(Brand.r2xl),
                  boxShadow: const [
                    BoxShadow(
                        color: Color(0x1A000000),
                        blurRadius: 15,
                        offset: Offset(0, 4)),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      height: 80,
                      width: 80,
                      decoration: const BoxDecoration(
                        color: Color(0xFFFEF9C3), // yellow-100
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.schedule,
                          size: 40, color: Brand.yellow600),
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      'KYC Under Review',
                      style: TextStyle(
                        fontFamily: Brand.heading,
                        fontSize: Brand.h2, // <h2>
                        fontWeight: FontWeight.w600,
                        color: Brand.gray900,
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Your KYC documents have been submitted successfully. '
                      'Our admin team will review and approve within 24-48 hours.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Brand.gray500),
                    ),
                    const SizedBox(height: 24),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0EBF8),
                        borderRadius: BorderRadius.circular(Brand.rLg),
                      ),
                      child: Text(
                        'Status: ${_status.toUpperCase()}',
                        style: const TextStyle(
                          fontSize: 14,
                          height: Brand.leadSm,
                          fontWeight: FontWeight.w500,
                          color: Brand.purple,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Vehicle and licence numbers are written in capitals everywhere else in the
/// system, so the field does not leave it to the captain's keyboard.
class UpperCaseFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
      TextEditingValue oldValue, TextEditingValue newValue) {
    return newValue.copyWith(text: newValue.text.toUpperCase());
  }
}
