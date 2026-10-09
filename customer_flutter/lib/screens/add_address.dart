import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../models/customer.dart';
import '../services/api.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/common.dart';
import '../widgets/location_picker.dart';

const _indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry',
];

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

  /// Shown only when the server definitely says the pincode is not served.
  /// A malformed pincode or a failed request must never show "coming soon".
  bool _notServiceable = false;

  bool get _isEdit => widget.editIndex != null;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
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
              )
          ]
        : next;

    final result = await Api.saveProfile(
      customerId,
      {'address': list.map((a) => a.toJson()).toList()},
    );
    if (!mounted) return;
    setState(() => _saving = false);

    if (!result.ok) {
      showToast(context, 'Failed to save address', error: true);
      return;
    }
    // The home screen reads this for its address line.
    await Store.setString(Store.kCachedAddress, address.oneLine);
    if (!mounted) return;
    showToast(context, _isEdit ? 'Address updated' : 'Address saved');
    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Brand.gray50,
      appBar: AppHeader(title: _isEdit ? 'Edit Address' : 'Add Address'),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: Column(
                children: [
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        _card(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              _field(_line1, 'Flat / House no, Building',
                                  onChanged: (_) => setState(() {})),
                              _field(_line2, 'Area, Landmark (optional)'),
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
                              _field(_city, 'City',
                                  onChanged: (_) => setState(() {})),
                              const Padding(
                                padding: EdgeInsets.only(bottom: 6),
                                child: Text('State',
                                    style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w500)),
                              ),
                              DropdownButtonFormField<String>(
                                initialValue: _state,
                                isExpanded: true,
                                hint: const Text('Select state'),
                                decoration: InputDecoration(
                                  enabledBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    borderSide: const BorderSide(
                                        color: Color(0xFFD1D5DB), width: 2),
                                  ),
                                ),
                                items: [
                                  for (final state in _indianStates)
                                    DropdownMenuItem(
                                        value: state, child: Text(state)),
                                ],
                                onChanged: (value) =>
                                    setState(() => _state = value),
                              ),
                              const SizedBox(height: 14),
                              GestureDetector(
                                onTap: () =>
                                    setState(() => _isPrimary = !_isPrimary),
                                child: Row(
                                  children: [
                                    Container(
                                      height: 21,
                                      width: 21,
                                      decoration: BoxDecoration(
                                        gradient:
                                            _isPrimary ? Brand.gradient : null,
                                        color:
                                            _isPrimary ? null : Colors.white,
                                        borderRadius: BorderRadius.circular(5),
                                        border: _isPrimary
                                            ? null
                                            : Border.all(
                                                color: Brand.disabled,
                                                width: 2),
                                      ),
                                      child: _isPrimary
                                          ? const Icon(Icons.check,
                                              size: 15, color: Colors.white)
                                          : null,
                                    ),
                                    const SizedBox(width: 12),
                                    const Text(
                                      'Use this as my default address',
                                      style: TextStyle(fontSize: 14),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (_notServiceable) ...[
                          const SizedBox(height: 14),
                          Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFF7ED),
                              borderRadius: BorderRadius.circular(16),
                              border:
                                  Border.all(color: const Color(0xFFFED7AA)),
                            ),
                            child: const Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Icon(Icons.info_outline,
                                    size: 18, color: Color(0xFFEA580C)),
                                SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    'We do not serve this pincode yet. You can '
                                    'still save the address, and we will let you '
                                    'know when we arrive.',
                                    style: TextStyle(
                                      fontSize: 12.5,
                                      color: Color(0xFF9A3412),
                                      height: 1.5,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                        const SizedBox(height: 14),
                        LocationPicker(
                          value: _pin,
                          onChanged: (picked) => setState(() => _pin = picked),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      border: Border(top: BorderSide(color: Brand.border)),
                    ),
                    child: GradientButton(
                      label: _saving
                          ? 'Saving...'
                          : (_isEdit ? 'Update Address' : 'Save Address'),
                      busy: _saving,
                      height: 50,
                      onPressed: _complete && !_saving ? _save : null,
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _card({required Widget child}) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: const [
            BoxShadow(
                color: Color(0x14000000), blurRadius: 12, offset: Offset(0, 4)),
          ],
        ),
        child: child,
      );

  Widget _field(
    TextEditingController controller,
    String label, {
    TextInputType? keyboard,
    List<TextInputFormatter>? formatters,
    ValueChanged<String>? onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
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
            onChanged: onChanged,
            decoration: InputDecoration(
              counterText: '',
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
