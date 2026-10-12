import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../models/customer.dart';
import '../services/api.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/common.dart';
import '../widgets/location_picker.dart';

const _indianStates = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

/// `shadow-lg`.
const _shadowLg = [
  BoxShadow(color: Color(0x1A000000), blurRadius: 15, offset: Offset(0, 10)),
];

const _blue300 = Color(0xFF93C5FD);
const _orange50 = Color(0xFFFFF7ED);
const _orange200 = Color(0xFFFED7AA);
const _orange600 = Color(0xFFEA580C);
const _orange700 = Color(0xFFC2410C);

/// A pill: `rounded-full` on a 48px field.
const _pill = 999.0;

class AddAddressScreen extends StatefulWidget {
  const AddAddressScreen({super.key, this.editIndex});

  /// Which saved address is being edited, if any.
  final int? editIndex;

  @override
  State<AddAddressScreen> createState() => _AddAddressScreenState();
}

class _AddAddressScreenState extends State<AddAddressScreen> {
  final _line1 = TextEditingController();
  final _line2 = TextEditingController();
  final _city = TextEditingController();
  final _pincode = TextEditingController();

  String? _state;
  bool _isPrimary = false;
  PickedLocation? _pin;

  List<CustomerAddress> _saved = [];
  bool _loading = true;
  bool _saving = false;

  /// The form is hidden behind the "+ Add New Address" button until it is
  /// wanted, and open from the start when an address is being edited.
  bool _showForm = false;

  /// Shown only when the server definitely says the pincode is not served.
  /// A malformed pincode or a failed request must never show "coming soon".
  bool _notServiceable = false;

  String _toastMessage = '';
  bool _toastIsError = false;
  Timer? _toastTimer;

  bool get _isEdit => widget.editIndex != null;

  @override
  void initState() {
    super.initState();
    _showForm = _isEdit;
    _load();
  }

  @override
  void dispose() {
    _toastTimer?.cancel();
    _line1.dispose();
    _line2.dispose();
    _city.dispose();
    _pincode.dispose();
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
      _saved = CustomerProfile.fromJson(result.map).addresses;
      final index = widget.editIndex;
      if (index != null && index >= 0 && index < _saved.length) {
        // The saved object is used directly, so nothing has to be recovered by
        // splitting display strings -- which is how the web screen lost the
        // dropped pin and mangled any city containing a comma.
        final address = _saved[index];
        _line1.text = address.street;
        _city.text = address.city;
        _state = _indianStates.contains(address.state) ? address.state : null;
        _pincode.text = address.pincode;
        _isPrimary = address.isDefault;
        if (address.hasPin) {
          _pin = PickedLocation(address.latitude!, address.longitude!);
        }
      }
    }
    setState(() => _loading = false);
  }

  Future<bool> _definitelyUnserviceable(String pincode) async {
    if (!RegExp(r'^\d{6}$').hasMatch(pincode)) return false;
    return !(await Api.isServiceable(pincode));
  }

  Future<void> _onPincodeChanged(String value) async {
    setState(() => _notServiceable = false);
    if (value.length != 6) return;

    final lookup = await Api.pincodeLookup(value);
    if (!mounted) return;
    if (lookup.ok && lookup.list.isNotEmpty && lookup.list.first is Map) {
      final place = Map<String, dynamic>.from(lookup.list.first as Map);
      // Only fill in what the customer has not already entered, so a typed
      // city is never overwritten.
      if (_city.text.trim().isEmpty) {
        _city.text = (place['city'] ?? '').toString();
      }
      if (_state == null) {
        final found = (place['state'] ?? '').toString();
        if (_indianStates.contains(found)) _state = found;
      }
      setState(() {});
    }

    final unserviceable = await _definitelyUnserviceable(value);
    if (!mounted) return;
    setState(() => _notServiceable = unserviceable);
  }

  bool get _complete =>
      _line1.text.trim().isNotEmpty &&
      _city.text.trim().isNotEmpty &&
      (_state ?? '').isNotEmpty &&
      _pincode.text.trim().length == 6;

  void _showToast(String message, {bool error = false}) {
    _toastTimer?.cancel();
    setState(() {
      _toastMessage = message;
      _toastIsError = error;
    });
    _toastTimer = Timer(const Duration(seconds: 3), () {
      if (mounted) setState(() => _toastMessage = '');
    });
  }

  void _clearForm() {
    _line1.clear();
    _line2.clear();
    _city.clear();
    _pincode.clear();
    setState(() {
      _state = null;
      _isPrimary = false;
      _pin = null;
      _notServiceable = false;
    });
  }

  Future<void> _delete(int index) async {
    final customerId = Store.customerId;
    if (customerId == null) return;

    final next = [..._saved]..removeAt(index);
    final result = await Api.saveProfile(customerId, {
      'address': next.map((a) => a.toJson()).toList(),
    });
    if (!mounted || !result.ok) return;
    setState(() => _saved = next);
  }

  Future<void> _save() async {
    if (_saving || !_complete) return;
    final customerId = Store.customerId;
    if (customerId == null) return;

    setState(() => _saving = true);

    // Informational only: saving is never blocked on this.
    final unserviceable = await _definitelyUnserviceable(_pincode.text.trim());
    if (mounted) setState(() => _notServiceable = unserviceable);

    final street = _line2.text.trim().isEmpty
        ? _line1.text.trim()
        : '${_line1.text.trim()}, ${_line2.text.trim()}';

    final address = CustomerAddress(
      street: street,
      city: _city.text.trim(),
      state: _state!,
      pincode: _pincode.text.trim(),
      latitude: _pin?.latitude,
      longitude: _pin?.longitude,
      isDefault: _isPrimary,
    );

    final next = [..._saved];
    final index = widget.editIndex;
    if (index != null && index >= 0 && index < next.length) {
      next[index] = address;
    } else {
      next.add(address);
    }
    // Only one address can be the default one.
    final list = _isPrimary
        ? [
            for (var i = 0; i < next.length; i++)
              CustomerAddress(
                street: next[i].street,
                city: next[i].city,
                state: next[i].state,
                pincode: next[i].pincode,
                latitude: next[i].latitude,
                longitude: next[i].longitude,
                isDefault: i == (index ?? next.length - 1),
              ),
          ]
        : next;

    final result = await Api.saveProfile(customerId, {
      'address': list.map((a) => a.toJson()).toList(),
    });
    if (!mounted) return;
    setState(() => _saving = false);

    if (!result.ok) {
      _showToast('Failed to save address', error: true);
      return;
    }
    // The home screen reads this for its address line.
    await Store.setString(Store.kCachedAddress, address.oneLine);
    if (!mounted) return;
    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Brand.gray50,
      appBar: AppHeader(
        title: _isEdit ? 'Edit Address' : 'Add Address',
        backTo: '/profile',
      ),
      bottomNavigationBar: _showForm ? _bottomBar() : null,
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Stack(
              children: [
                ListView(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                  children: [
                    if (_saved.isNotEmpty) ...[
                      _savedAddresses(),
                      const SizedBox(height: 12), // space-y-3
                    ],
                    if (!_showForm && _saved.length < 3) _addNewButton(),
                    if (_showForm) ..._form(),
                  ],
                ),
                if (_toastMessage.isNotEmpty)
                  TopToast(
                    message: _toastMessage,
                    error: _toastIsError,
                    onClose: () {
                      _toastTimer?.cancel();
                      setState(() => _toastMessage = '');
                    },
                  ),
              ],
            ),
    );
  }

  // ---- the saved addresses -------------------------------------------------

  Widget _savedAddresses() => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Text(
        'Saved Addresses (${_saved.length}/3)',
        style: const TextStyle(
          fontFamily: Brand.heading,
          fontSize: 18, // text-lg
          fontWeight: FontWeight.w700,
          color: Colors.black,
        ),
      ),
      for (var i = 0; i < _saved.length; i++) ...[
        const SizedBox(height: 12), // space-y-3
        _savedCard(i),
      ],
    ],
  );

  Widget _savedCard(int index) {
    final address = _saved[index];
    return Container(
      padding: const EdgeInsets.all(16), // p-4
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Brand.r2xl),
        boxShadow: _shadowLg,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  address.street,
                  // <p class="font-semibold text-black"> -- no size utility,
                  // so the body's own 16px.
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.black,
                  ),
                ),
                Text(
                  '${address.city}, ${address.state} - ${address.pincode}',
                  style: const TextStyle(fontSize: 14, color: Brand.gray600),
                ),
                if (address.isDefault)
                  const Text(
                    'Primary',
                    style: TextStyle(
                      fontSize: 12, // text-xs
                      fontWeight: FontWeight.w500,
                      color: Brand.blue500,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12), // ml-3
          GestureDetector(
            onTap: () => _delete(index),
            behavior: HitTestBehavior.opaque,
            child: const Text(
              'Delete',
              style: TextStyle(
                fontFamily: Brand.heading, // a <button>
                fontSize: 14, // text-sm
                fontWeight: FontWeight.w600,
                color: Brand.red500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _addNewButton() => GestureDetector(
    onTap: () => setState(() => _showForm = true),
    behavior: HitTestBehavior.opaque,
    child: CustomPaint(
      painter: const DashedBorderPainter(
        color: _blue300,
        radius: Brand.r2xl,
        strokeWidth: 2,
      ),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16), // py-4
        alignment: Alignment.center,
        child: const Text(
          '+ Add New Address',
          // A <button> with no size utility: index.css gives buttons text-xs.
          style: TextStyle(
            fontFamily: Brand.heading,
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: Brand.blue500,
          ),
        ),
      ),
    ),
  );

  // ---- the form ------------------------------------------------------------

  List<Widget> _form() => [
    _field(_line1, 'Address Line 1', onChanged: (_) => setState(() {})),
    const SizedBox(height: 12), // space-y-3
    _field(_line2, 'Address Line 2 (Optional)'),
    const SizedBox(height: 12),
    _field(_city, 'City', onChanged: (_) => setState(() {})),
    const SizedBox(height: 12),
    _stateField(),
    const SizedBox(height: 12),
    _field(
      _pincode,
      'Pincode',
      keyboard: TextInputType.number,
      formatters: [
        FilteringTextInputFormatter.digitsOnly,
        LengthLimitingTextInputFormatter(6),
      ],
      onChanged: (value) {
        setState(() {});
        _onPincodeChanged(value);
      },
    ),
    // The map appears once there is enough of an address to place it near.
    if (_line1.text.trim().isNotEmpty &&
        _city.text.trim().isNotEmpty &&
        _pincode.text.trim().isNotEmpty) ...[
      const SizedBox(height: 12),
      LocationPicker(
        value: _pin,
        onChanged: (picked) => setState(() => _pin = picked),
      ),
    ],
    if (_notServiceable) ...[const SizedBox(height: 12), _comingSoon()],
    const SizedBox(height: 12),
    _primaryToggle(),
  ];

  Widget _field(
    TextEditingController controller,
    String hint, {
    TextInputType? keyboard,
    List<TextInputFormatter>? formatters,
    ValueChanged<String>? onChanged,
  }) {
    return SizedBox(
      height: 48, // p-3 either side of a text-sm line
      child: TextField(
        controller: controller,
        keyboardType: keyboard,
        inputFormatters: formatters,
        onChanged: onChanged,
        style: const TextStyle(fontSize: 14, color: Colors.black),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(fontSize: 14, color: Brand.gray400),
          counterText: '',
          filled: true,
          fillColor: Colors.white,
          contentPadding: const EdgeInsets.symmetric(horizontal: 12), // p-3
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(_pill),
            borderSide: const BorderSide(color: Brand.blue500, width: 2),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(_pill),
            borderSide: const BorderSide(color: Brand.blue600, width: 2),
          ),
        ),
      ),
    );
  }

  /// The `<select>`, which on Android opens as a list of its options.
  Widget _stateField() => Container(
    height: 48, // min-h-[48px]
    padding: const EdgeInsets.symmetric(horizontal: 12), // p-3
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(_pill),
      border: Border.all(color: Brand.blue500, width: 2),
    ),
    child: DropdownButtonHideUnderline(
      child: DropdownButton<String>(
        value: _state,
        isExpanded: true,
        hint: const Text(
          'Select State',
          style: TextStyle(fontSize: 14, color: Brand.gray400),
        ),
        // `appearance-none` with a ChevronDown placed on top.
        icon: const Icon(
          Icons.keyboard_arrow_down,
          size: 16, // w-4 h-4
          color: Brand.gray400,
        ),
        style: const TextStyle(
          fontFamily: Brand.body,
          fontSize: 14,
          color: Colors.black,
        ),
        items: [
          for (final state in _indianStates)
            DropdownMenuItem(value: state, child: Text(state)),
        ],
        onChanged: (value) => setState(() => _state = value),
      ),
    ),
  );

  Widget _comingSoon() => Container(
    padding: const EdgeInsets.all(12), // p-3
    decoration: BoxDecoration(
      color: _orange50,
      border: Border.all(color: _orange200),
      borderRadius: BorderRadius.circular(Brand.r2xl),
    ),
    child: Column(
      children: [
        const Text(
          '🚀 Coming Soon to Your Area!',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 14, // text-sm
            fontWeight: FontWeight.w500,
            color: _orange700,
          ),
        ),
        const SizedBox(height: 4), // mb-1
        const Text(
          "We're not here yet to provide service, but we'll save your address "
          'for future updates.',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 12, color: _orange600), // text-xs
        ),
      ],
    ),
  );

  Widget _primaryToggle() => GestureDetector(
    onTap: () => setState(() => _isPrimary = !_isPrimary),
    behavior: HitTestBehavior.opaque,
    child: Padding(
      padding: const EdgeInsets.symmetric(vertical: 12), // py-3
      child: Row(
        children: [
          Container(
            height: 20, // w-5 h-5
            width: 20,
            decoration: BoxDecoration(
              color: _isPrimary ? Brand.blue500 : null,
              shape: BoxShape.circle,
              border: Border.all(
                color: _isPrimary ? Brand.blue500 : Brand.gray300,
                width: 2,
              ),
            ),
            child: Center(
              child: _isPrimary
                  ? Container(
                      height: 10, // w-2.5 h-2.5
                      width: 10,
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                    )
                  : null,
            ),
          ),
          const SizedBox(width: 12), // gap-3
          const Text(
            'Set as Primary Address',
            style: TextStyle(
              fontSize: 14, // text-sm
              fontWeight: FontWeight.w500,
              color: Colors.black,
            ),
          ),
        ],
      ),
    ),
  );

  // ---- the fixed footer ----------------------------------------------------

  Widget _bottomBar() {
    final inset = MediaQuery.of(context).padding.bottom;
    return Container(
      // `p-4` with the system-nav allowance underneath it.
      padding: EdgeInsets.fromLTRB(16, 16, 16, inset > 24 ? inset : 24),
      decoration: const BoxDecoration(
        color: Colors.white,
        boxShadow: _shadowLg,
      ),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () {
                setState(() => _showForm = false);
                _clearForm();
              },
              behavior: HitTestBehavior.opaque,
              child: Container(
                height: 44, // py-3 around the taller of the two labels
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(_pill),
                  border: Border.all(color: Brand.gray300),
                ),
                child: const Text(
                  'Cancel',
                  style: TextStyle(
                    fontFamily: Brand.heading,
                    fontSize: 12, // a <button> with no size utility
                    fontWeight: FontWeight.w600,
                    color: Brand.gray600,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12), // gap-3
          Expanded(
            child: GradientButton(
              label: _saving ? 'Saving...' : 'Save Address',
              busy: _saving,
              height: 44,
              radius: _pill,
              fontSize: 14, // text-sm
              shadow: false,
              // `background: #d1d5db` when it cannot be pressed.
              disabledLook: DisabledLook.flatGrey300,
              onPressed: _complete && !_saving ? _save : null,
            ),
          ),
        ],
      ),
    );
  }
}
