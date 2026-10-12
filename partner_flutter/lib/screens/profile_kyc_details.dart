import 'dart:async';

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../services/api.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/common.dart';
import '../widgets/photo_picker.dart';

/// `app/profile/kyc-details/page.tsx`.
///
/// What the captain sees once KYC is in: the status, the admin's rejection
/// reason if there is one, the documents as submitted, and a one-tap resubmit
/// that sends the same documents round again.
///
/// Carried over as-is: the "Edit KYC" link here goes to `/profile/kyc`, which
/// sees a status of `rejected` -- anything other than `pending` -- and shows
/// its waiting screen rather than the form, then bounces straight back here.
/// So a rejected captain can resubmit what they already sent but cannot
/// replace a document. That is how the shipped app behaves (CLAUDE.md 9.3) and
/// this port does not quietly change it.
class ProfileKycDetailsScreen extends StatefulWidget {
  const ProfileKycDetailsScreen({super.key});

  @override
  State<ProfileKycDetailsScreen> createState() =>
      _ProfileKycDetailsScreenState();
}

class _ProfileKycDetailsScreenState extends State<ProfileKycDetailsScreen> {
  Map<String, dynamic>? _partner;
  bool _loading = true;
  bool _resubmitting = false;
  bool _resubmitSuccess = false;
  Timer? _poll;

  /// A TextSpan needs a recognizer object that outlives the build, and it has
  /// to be disposed with the widget.
  late final TapGestureRecognizer _editKyc = TapGestureRecognizer()
    ..onTap = () => Navigator.of(context).pushNamed('/profile/kyc');

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _poll?.cancel();
    _editKyc.dispose();
    super.dispose();
  }

  String get _status => (_partner?['kycStatus'] ?? 'pending').toString();
  bool get _isRejected => _status == 'rejected';
  bool get _isPending => _status == 'pending';
  bool get _isApproved => _status == 'approved';

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
      if (result.ok) _partner = result.map;
      _loading = false;
    });
    _syncPolling();
  }

  /// Polls while there is something to wait for: a pending review, or a
  /// resubmission that has just gone in.
  void _syncPolling() {
    final shouldPoll = _isPending || _resubmitSuccess;
    if (!shouldPoll) {
      _poll?.cancel();
      _poll = null;
      return;
    }
    if (_poll != null) return;

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
        _poll = null;
        if (!mounted) return;
        setState(() {
          _partner = result.map;
          _resubmitSuccess = false;
        });
      }
    });
  }

  Future<void> _resubmit() async {
    final partnerId = Store.partnerId;
    final partner = _partner;
    if (partnerId == null || partner == null) return;

    setState(() => _resubmitting = true);
    final result = await Api.submitKyc(partnerId, {
      'vehicleType': (partner['vehicleType'] ?? '').toString(),
      'vehicleNumber': (partner['vehicleNumber'] ?? '').toString(),
      'aadharNumber': (partner['aadharNumber'] ?? '').toString(),
      'aadharImage': (partner['aadharImage'] ?? '').toString(),
      'drivingLicenseNumber':
          (partner['drivingLicenseNumber'] ?? '').toString(),
      'drivingLicenseImage': (partner['drivingLicenseImage'] ?? '').toString(),
    });

    if (!mounted) return;
    setState(() => _resubmitting = false);

    if (!result.ok) {
      showToast(
          context, result.error ?? 'Failed to resubmit KYC. Please try again.',
          kind: ToastKind.error);
      return;
    }
    setState(() {
      _partner = result.map;
      _resubmitSuccess = true;
    });
    _syncPolling();
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
                  strokeWidth: 4,
                  color: Color(0xFFE0D4F7),
                ),
              ),
              SizedBox(height: 16),
              Text('Loading...', style: TextStyle(color: Brand.gray500)),
            ],
          ),
        ),
      );
    }

    final partner = _partner ?? const {};
    final incomplete = (partner['vehicleType'] ?? '').toString().isEmpty ||
        (partner['aadharNumber'] ?? '').toString().isEmpty ||
        (partner['drivingLicenseNumber'] ?? '').toString().isEmpty;

    return Scaffold(
      backgroundColor: Brand.gray50,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 40), // p-4 pb-10
          child: Container(
            decoration: BoxDecoration(
              color: Brand.surface,
              borderRadius: BorderRadius.circular(Brand.r2xl),
              boxShadow: const [
                BoxShadow(
                    color: Color(0x14000000),
                    blurRadius: 8,
                    offset: Offset(0, 2)),
              ],
            ),
            clipBehavior: Clip.antiAlias,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _titleRow(),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (_isPending && !_resubmitSuccess) ...[
                        _banner(
                          background: const Color(0xFFFEFCE8),
                          border: const Color(0xFFFEF08A),
                          child: const Text(
                            '\u{1F4CB} Your KYC is under review. Admin will verify within 24–48 hours.',
                            style: TextStyle(
                                fontSize: 14, color: Color(0xFF854D0E)),
                          ),
                        ),
                        const SizedBox(height: 20),
                      ],
                      if (_resubmitSuccess) ...[
                        _resubmittedBanner(),
                        const SizedBox(height: 20),
                      ],
                      if (_isApproved) ...[
                        _banner(
                          background: const Color(0xFFF0FDF4),
                          border: const Color(0xFFBBF7D0),
                          child: const Text(
                            '✅ Your KYC has been approved! You can now accept orders.',
                            style: TextStyle(
                                fontSize: 14, color: Color(0xFF166534)),
                          ),
                        ),
                        const SizedBox(height: 20),
                      ],
                      if (_isRejected && !_resubmitSuccess) ...[
                        _rejectedBanner(partner),
                        const SizedBox(height: 20),
                      ],
                      _field(
                          'Vehicle Type',
                          _capitalise(
                              (partner['vehicleType'] ?? '').toString())),
                      _field(
                          'Vehicle Number',
                          (partner['vehicleNumber'] ?? '')
                              .toString()
                              .toUpperCase()),
                      _field('Aadhar Number',
                          _maskAadhar(partner['aadharNumber'])),
                      _imageField('Aadhar Card Image', partner['aadharImage']),
                      _field(
                          'Driving License Number',
                          (partner['drivingLicenseNumber'] ?? '')
                              .toString()
                              .toUpperCase()),
                      _imageField('Driving License Image',
                          partner['drivingLicenseImage']),
                      if ((partner['kycSubmittedAt'] ?? '')
                          .toString()
                          .isNotEmpty)
                        _field('Last Submitted On',
                            _formatDate(partner['kycSubmittedAt'])),
                      if (_isRejected && !_resubmitSuccess) _resubmitBlock(),
                      if (incomplete && !_isRejected) _incompleteBlock(),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _titleRow() {
    final (background, foreground) = _isApproved
        ? (const Color(0xFFDCFCE7), const Color(0xFF166534))
        : _isRejected
            ? (const Color(0xFFFEE2E2), const Color(0xFF991B1B))
            : (const Color(0xFFFEF9C3), const Color(0xFF854D0E));

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Brand.gray200)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text(
            'KYC Information',
            style: TextStyle(
              fontFamily: Brand.heading,
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Brand.gray900,
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: background,
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              _status.toUpperCase(),
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: foreground,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _banner({
    required Color background,
    required Color border,
    required Widget child,
    EdgeInsets padding = const EdgeInsets.all(12),
  }) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: background,
        border: Border.all(color: border),
        borderRadius: BorderRadius.circular(Brand.rXl),
      ),
      child: child,
    );
  }

  Widget _resubmittedBanner() => _banner(
        background: const Color(0xFFF0FDF4),
        border: const Color(0xFFBBF7D0),
        padding: const EdgeInsets.all(16),
        child: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text('✅', style: TextStyle(fontSize: 24)),
                SizedBox(width: 8),
                Text(
                  'KYC Resubmitted!',
                  style: TextStyle(
                    fontFamily: Brand.heading,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF166534),
                  ),
                ),
              ],
            ),
            SizedBox(height: 8),
            Text(
              'Your KYC has been sent to admin for review. You will be able to '
              'accept orders once admin approves. Please wait 24–48 hours.',
              style: TextStyle(fontSize: 14, color: Color(0xFF15803D)),
            ),
          ],
        ),
      );

  Widget _rejectedBanner(Map<String, dynamic> partner) {
    final reason = (partner['kycRejectionReason'] ?? '').toString();
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        border: Border.all(color: const Color(0xFFFCA5A5), width: 2),
        borderRadius: BorderRadius.circular(Brand.rXl),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Text('❌', style: TextStyle(fontSize: 20)),
              SizedBox(width: 8),
              Text(
                'KYC Rejected',
                style: TextStyle(
                  fontFamily: Brand.heading,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFFB91C1C),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'Reason from Admin:',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Brand.red600,
            ),
          ),
          const SizedBox(height: 4),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFFFEE2E2),
              borderRadius: BorderRadius.circular(Brand.rLg),
            ),
            child: Text(
              reason.isEmpty ? 'No reason provided' : reason,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: Color(0xFFB91C1C),
              ),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Review your documents below and tap Resubmit KYC to send again.',
            style: TextStyle(fontSize: 12, color: Color(0xFFEF4444)),
          ),
        ],
      ),
    );
  }

  Widget _field(String label, String value) {
    final empty = value.trim().isEmpty;
    return Padding(
      padding: const EdgeInsets.only(bottom: 16), // space-y-4
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Brand.gray50,
          borderRadius: BorderRadius.circular(Brand.rXl),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label.toUpperCase(),
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5,
                color: Brand.gray500,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              empty ? 'Not provided' : value,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
                color: empty ? Brand.gray400 : Brand.gray900,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _imageField(String label, Object? value) {
    final provider = imageProviderFor(value?.toString());
    if (provider == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Brand.gray50,
          borderRadius: BorderRadius.circular(Brand.rXl),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label.toUpperCase(),
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5,
                color: Brand.gray500,
              ),
            ),
            const SizedBox(height: 8),
            GestureDetector(
              onTap: () => _viewFullSize(provider),
              child: Container(
                height: 176, // h-44
                decoration: BoxDecoration(
                  border: Border.all(color: Brand.gray200),
                  borderRadius: BorderRadius.circular(Brand.rLg),
                ),
                child: Image(image: provider, fit: BoxFit.contain),
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Tap image to view full size',
              style: TextStyle(fontSize: 12, color: Brand.gray400),
            ),
          ],
        ),
      ),
    );
  }

  /// The web app opens the data URL in a new tab; on a phone a full-screen
  /// viewer is the equivalent, and it can be pinched.
  void _viewFullSize(ImageProvider provider) {
    showDialog<void>(
      context: context,
      barrierColor: Colors.black87,
      builder: (context) => GestureDetector(
        onTap: () => Navigator.of(context).pop(),
        child: InteractiveViewer(
          maxScale: 5,
          child: Center(child: Image(image: provider, fit: BoxFit.contain)),
        ),
      ),
    );
  }

  Widget _resubmitBlock() {
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text.rich(
            TextSpan(
              style: const TextStyle(fontSize: 12, color: Brand.gray500),
              children: [
                const TextSpan(
                  text: 'Your existing documents will be resubmitted to admin '
                      'for review. If you need to change any document, go to ',
                ),
                TextSpan(
                  text: 'Edit KYC',
                  style: const TextStyle(
                    decoration: TextDecoration.underline,
                    fontWeight: FontWeight.w600,
                    color: Brand.purple,
                  ),
                  recognizer: _editKyc,
                ),
                const TextSpan(text: ' first.'),
              ],
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          GradientButton(
            label: _resubmitting ? 'Resubmitting...' : '\u{1F504} Resubmit KYC',
            height: 56, // py-4
            radius: Brand.r2xl,
            busy: _resubmitting,
            onPressed: _resubmitting ? null : _resubmit,
          ),
        ],
      ),
    );
  }

  Widget _incompleteBlock() {
    return _banner(
      background: const Color(0xFFEFF6FF),
      border: const Color(0xFFBFDBFE),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '\u{1F4DD} Complete your KYC verification to start accepting orders.',
            style: TextStyle(fontSize: 14, color: Color(0xFF1E40AF)),
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerLeft,
            child: Material(
              borderRadius: BorderRadius.circular(Brand.rLg),
              child: InkWell(
                borderRadius: BorderRadius.circular(Brand.rLg),
                onTap: () => Navigator.of(context).pushNamed('/profile/kyc'),
                child: Ink(
                  decoration: BoxDecoration(
                    gradient: Brand.gradient,
                    borderRadius: BorderRadius.circular(Brand.rLg),
                  ),
                  child: const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Text(
                      'Complete KYC',
                      style: TextStyle(
                        fontFamily: Brand.heading,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  static String _capitalise(String value) =>
      value.isEmpty ? value : '${value[0].toUpperCase()}${value.substring(1)}';

  /// `XXXX-XXXX-1234` -- only the last four digits are shown, the same as the
  /// web screen. (The admin panel still shows the whole number; that is a
  /// backend screen and out of scope here.)
  static String _maskAadhar(Object? value) {
    final digits = (value ?? '').toString();
    if (digits.isEmpty) return '';
    final tail =
        digits.length <= 4 ? digits : digits.substring(digits.length - 4);
    return 'XXXX-XXXX-$tail';
  }

  static String _formatDate(Object? value) {
    final parsed = DateTime.tryParse(value?.toString() ?? '');
    if (parsed == null) return '';
    return DateFormat("d MMMM yyyy, hh:mm a").format(parsed.toLocal());
  }
}
