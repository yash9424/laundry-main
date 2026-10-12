import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/api.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/common.dart';
import '../widgets/bottom_nav.dart';

/// `app/profile/personal/page.tsx`.
///
/// Read-only until "Edit" is tapped, then the same card turns into a form and
/// the button becomes "Save". The mobile number is never editable here -- it
/// is the account's identity.
class ProfilePersonalScreen extends StatefulWidget {
  const ProfilePersonalScreen({super.key});

  @override
  State<ProfilePersonalScreen> createState() => _ProfilePersonalScreenState();
}

class _ProfilePersonalScreenState extends State<ProfilePersonalScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _city = TextEditingController();
  final _state = TextEditingController();
  final _street = TextEditingController();
  final _vehicleNumber = TextEditingController();
  final List<TextEditingController> _pincodes = [];

  String _mobile = '';

  /// What the server already holds, kept so a save cannot blank it.
  String _addressPincode = '';
  String _vehicleType = '';
  bool _loading = true;
  bool _editing = false;
  bool _saving = false;

  static const _vehicleTypes = ['bike', 'scooter', 'car'];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _city.dispose();
    _state.dispose();
    _street.dispose();
    _vehicleNumber.dispose();
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

    final result = await Api.partner(partnerId);
    if (!mounted) return;
    if (result.ok) {
      final data = result.map;
      final address = data['address'] is Map
          ? Map<String, dynamic>.from(data['address'] as Map)
          : const {};
      final pincodes = (data['pincodes'] is List)
          ? (data['pincodes'] as List).map((p) => p.toString()).toList()
          : <String>[];

      _name.text = (data['name'] ?? '').toString();
      _email.text = (data['email'] ?? '').toString();
      _mobile = (data['mobile'] ?? '').toString();
      _city.text = (address['city'] ?? '').toString();
      _state.text = (address['state'] ?? '').toString();
      _street.text = (address['street'] ?? '').toString();
      _addressPincode = (address['pincode'] ?? '').toString();
      _vehicleType = (data['vehicleType'] ?? '').toString();
      _vehicleNumber.text = (data['vehicleNumber'] ?? '').toString();

      for (final c in _pincodes) {
        c.dispose();
      }
      _pincodes
        ..clear()
        ..addAll(pincodes.isEmpty
            ? [TextEditingController()]
            : pincodes.map((p) => TextEditingController(text: p)));
    }
    setState(() => _loading = false);
  }

  Future<void> _save() async {
    final partnerId = Store.partnerId;
    if (partnerId == null) return;

    setState(() => _saving = true);
    final pincodes = _pincodes
        .map((c) => c.text.trim())
        .where((p) => p.length == 6)
        .toList();
    final result = await Api.updatePartner(partnerId, {
      'name': _name.text.trim(),
      'email': _email.text.trim(),
      'address': {
        'street': _street.text.trim(),
        'city': _city.text.trim(),
        'state': _state.text.trim(),
        // The web screen re-derives this from the first service pincode on
        // every save, and two screens depend on it: the hub a drop-off is
        // matched to, and the pincodes a delivery is offered for. Leaving it
        // out let it drift behind the service pincodes.
        'pincode': pincodes.isNotEmpty ? pincodes.first : _addressPincode,
      },
      'pincodes': pincodes,
      'vehicleType': _vehicleType,
      'vehicleNumber': _vehicleNumber.text.trim(),
    });

    if (!mounted) return;
    setState(() => _saving = false);

    if (!result.ok) {
      showToast(context, result.error ?? 'Failed to update profile',
          kind: ToastKind.error);
      return;
    }
    showToast(context, 'Profile updated successfully!',
        kind: ToastKind.success);
    setState(() => _editing = false);
    await _load();
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

    final servicePincodes =
        _pincodes.map((c) => c.text.trim()).where((p) => p.isNotEmpty).toList();

    return Scaffold(
      bottomNavigationBar: const PartnerBottomNav(current: NavTab.profile),
      backgroundColor: Brand.gray50,
      body: SafeArea(
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
            Container(
              decoration: BoxDecoration(
                color: Brand.surface,
                borderRadius: BorderRadius.circular(Brand.rLg),
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
                        _entry('Full Name', _name),
                        _readOnly(
                            'Mobile Number', _mobile.isEmpty ? 'N/A' : _mobile),
                        _entry('Email', _email,
                            keyboardType: TextInputType.emailAddress),
                        _pincodeEntry(servicePincodes),
                        _chips('Registered Address Pincodes', servicePincodes,
                            note: 'All service area pincodes'),
                        _entry('City', _city),
                        _entry('State', _state),
                        _entry('Street Address', _street),
                        _vehicleEntry(),
                        _entry('Vehicle Number', _vehicleNumber,
                            formatters: [UpperCaseTextFormatter()]),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _titleRow() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Brand.gray200)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text(
            'Personal Information',
            style: TextStyle(
              fontFamily: Brand.heading,
              fontSize: Brand.h2, // <h2>
              fontWeight: FontWeight.w600,
              color: Brand.gray900,
            ),
          ),
          Material(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(Brand.rLg),
            child: InkWell(
              borderRadius: BorderRadius.circular(Brand.rLg),
              onTap: _saving
                  ? null
                  : () => _editing ? _save() : setState(() => _editing = true),
              child: Ink(
                decoration: BoxDecoration(
                  gradient: _saving ? null : Brand.gradient,
                  color: _saving ? Brand.gray400 : null,
                  borderRadius: BorderRadius.circular(Brand.rLg),
                ),
                child: Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Text(
                    _saving ? 'Saving...' : (_editing ? 'Save' : 'Edit'),
                    style: const TextStyle(
                      fontFamily: Brand.heading,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: Colors.white,
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

  Widget _label(String text) => Text(
        text,
        style: const TextStyle(
          fontSize: 14,
          height: Brand.leadSm,
          fontWeight: FontWeight.w600,
          color: Color(0xFF1F2937),
        ),
      );

  Widget _entry(
    String label,
    TextEditingController controller, {
    TextInputType? keyboardType,
    List<TextInputFormatter>? formatters,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16), // space-y-4
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _label(label),
          const SizedBox(height: 4),
          if (_editing)
            TextField(
              controller: controller,
              keyboardType: keyboardType,
              inputFormatters: formatters,
              style: const TextStyle(
                  fontSize: 16, height: Brand.leadBase, color: Brand.gray900),
              decoration: InputDecoration(
                isDense: false,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(Brand.rLg),
                  borderSide: const BorderSide(color: Brand.gray300),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(Brand.rLg),
                  borderSide: const BorderSide(color: Brand.purple, width: 2),
                ),
              ),
            )
          else
            Text(
              controller.text.trim().isEmpty ? 'N/A' : controller.text,
              style: const TextStyle(
                  fontSize: 16, height: Brand.leadBase, color: Brand.gray900),
            ),
        ],
      ),
    );
  }

  Widget _readOnly(String label, String value) => Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _label(label),
            const SizedBox(height: 4),
            Text(value,
                style: const TextStyle(
                    fontSize: 16,
                    height: Brand.leadBase,
                    color: Brand.gray900)),
          ],
        ),
      );

  Widget _pincodeEntry(List<String> current) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _label('Service Areas (Pincodes)'),
          const SizedBox(height: 4),
          if (!_editing)
            _chipRow(current)
          else
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (var i = 0; i < _pincodes.length; i++) ...[
                  if (i > 0) const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _pincodes[i],
                          keyboardType: TextInputType.number,
                          maxLength: 6,
                          onChanged: (_) => setState(() {}),
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                            LengthLimitingTextInputFormatter(6),
                          ],
                          style: const TextStyle(color: Brand.gray900),
                          decoration: InputDecoration(
                            hintText: 'Enter 6-digit pincode',
                            counterText: '',
                            isDense: false,
                            contentPadding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 8),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(Brand.rLg),
                              borderSide:
                                  const BorderSide(color: Brand.gray300),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(Brand.rLg),
                              borderSide: const BorderSide(
                                  color: Brand.purple, width: 2),
                            ),
                          ),
                        ),
                      ),
                      if (_pincodes.length > 1) ...[
                        const SizedBox(width: 8),
                        GestureDetector(
                          onTap: () =>
                              setState(() => _pincodes.removeAt(i).dispose()),
                          child: Container(
                            height: 32,
                            width: 32,
                            decoration: const BoxDecoration(
                              color: Color(0xFFFEE2E2),
                              shape: BoxShape.circle,
                            ),
                            child: const Center(
                              child: Text('×',
                                  style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: Brand.red600)),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Material(
                    color: const Color(0xFFF3F0FF),
                    borderRadius: BorderRadius.circular(Brand.rLg),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(Brand.rLg),
                      onTap: () => setState(
                          () => _pincodes.add(TextEditingController())),
                      child: const Padding(
                        padding:
                            EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        child: Text('+ Add Pincode',
                            style: TextStyle(
                                fontSize: 14,
                                height: Brand.leadSm,
                                fontWeight: FontWeight.w500,
                                color: Brand.purple)),
                      ),
                    ),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _chips(String label, List<String> values, {String? note}) => Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _label(label),
            const SizedBox(height: 4),
            _chipRow(values),
            if (note != null) ...[
              const SizedBox(height: 4),
              Text(note,
                  style: const TextStyle(
                      fontSize: 12,
                      height: Brand.leadXs,
                      color: Brand.gray500)),
            ],
          ],
        ),
      );

  Widget _chipRow(List<String> values) {
    if (values.isEmpty) {
      return const Text('N/A',
          style: TextStyle(
              fontSize: 16, height: Brand.leadBase, color: Brand.gray900));
    }
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final value in values)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              gradient: Brand.gradient,
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                height: Brand.leadSm,
                fontWeight: FontWeight.w500,
                color: Colors.white,
              ),
            ),
          ),
      ],
    );
  }

  Widget _vehicleEntry() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _label('Vehicle Type'),
          const SizedBox(height: 4),
          if (!_editing)
            Text(
              _vehicleType.isEmpty
                  ? 'N/A'
                  : '${_vehicleType[0].toUpperCase()}${_vehicleType.substring(1)}',
              style: const TextStyle(
                  fontSize: 16, height: Brand.leadBase, color: Brand.gray900),
            )
          else
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(Brand.rLg),
                border: Border.all(color: Brand.gray300),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  isExpanded: true,
                  value: _vehicleType.isEmpty ? null : _vehicleType,
                  hint: const Text('Select Vehicle Type',
                      style: TextStyle(
                          fontSize: 16,
                          height: Brand.leadBase,
                          color: Brand.gray400)),
                  style: const TextStyle(
                      fontSize: 16,
                      height: Brand.leadBase,
                      color: Brand.gray900),
                  items: [
                    for (final type in _vehicleTypes)
                      DropdownMenuItem(
                        value: type,
                        child: Text(
                            '${type[0].toUpperCase()}${type.substring(1)}'),
                      ),
                  ],
                  onChanged: (value) =>
                      setState(() => _vehicleType = value ?? ''),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Shared with the KYC screen: vehicle and licence numbers are capitals
/// everywhere else in the system.
class UpperCaseTextFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
      TextEditingValue oldValue, TextEditingValue newValue) {
    return newValue.copyWith(text: newValue.text.toUpperCase());
  }
}
