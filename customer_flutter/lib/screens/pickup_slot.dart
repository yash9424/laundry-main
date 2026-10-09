import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/checkout.dart';
import '../models/order_charges.dart';
import '../services/api.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/common.dart';

/// How many days ahead a pickup can be booked.
const _pickupDays = 4;

class _Slot {
  const _Slot(this.id, this.time);

  final String id;
  final String time;
}

/// Step two of checkout: which day and which window.
///
/// Lifted out of the cart, where it lived inside a dialog. A dialog is not a
/// place you can go back to, so the hardware back button fell through to the
/// cart's own handler, which closed the app. As a screen, back simply returns
/// to the checklist.
class PickupSlotScreen extends StatefulWidget {
  const PickupSlotScreen({super.key, required this.draft});

  final CheckoutDraft? draft;

  @override
  State<PickupSlotScreen> createState() => _PickupSlotScreenState();
}

class _PickupSlotScreenState extends State<PickupSlotScreen> {
  List<_Slot> _slots = [];
  String _selectedSlot = '';
  int _dayIndex = 0;
  bool _slotError = false;
  bool _garmentConfirmed = false;
  bool _loadingSlots = true;

  num _expressFee = 0;
  bool _expressChosen = false;
  OrderChargesConfig _charges = OrderChargesConfig.defaults();

  CheckoutDraft? get _draft => widget.draft;

  String get _pickupType => _dayIndex == 0 ? 'now' : 'later';

  num get _itemsTotal => _draft?.itemsTotal ?? 0;

  num get _orderTotal => _itemsTotal + (_expressChosen ? _expressFee : 0);

  @override
  void initState() {
    super.initState();
    _expressChosen = Store.getString(Store.kDeliveryType) == 'express';
    final draft = _draft;
    if (draft == null || draft.isEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) Navigator.of(context).pushReplacementNamed('/cart');
      });
      return;
    }
    _start();
  }

  Future<void> _start() async {
    final result = await Api.orderCharges();
    if (!mounted) return;
    if (result.ok) {
      final charges = OrderChargesConfig.fromJson(result.map);
      setState(() {
        _charges = charges;
        _expressFee = charges.expressEnabled ? charges.expressPrice : 0;
        if (!charges.expressEnabled) _expressChosen = false;
      });
    }
    await _fetchSlots(0);
  }

  Future<void> _fetchSlots(int offset) async {
    setState(() => _loadingSlots = true);
    final result = await Api.timeSlots(
      dayOffset: offset,
      serviceType: _expressChosen ? 'express' : 'standard',
    );
    if (!mounted) return;

    if (!result.ok) {
      setState(() => _loadingSlots = false);
      return;
    }

    final slots = result.list
        .whereType<Map>()
        .map((m) => _Slot(
              (m['_id'] ?? '').toString(),
              (m['time'] ?? '').toString(),
            ))
        .where((s) => s.time.isNotEmpty)
        .toList();

    // If every slot today has already gone, open on the next date rather than
    // leaving the customer looking at a greyed-out list.
    if (offset == 0 &&
        slots.isNotEmpty &&
        !slots.any((s) => !_isSlotPassed(s.time, 0))) {
      setState(() => _dayIndex = 1);
      await _fetchSlots(1);
      return;
    }

    final available = slots.where((s) => !_isSlotPassed(s.time, offset)).toList();
    setState(() {
      _slots = slots;
      _selectedSlot = available.isNotEmpty ? available.first.time : '';
      _loadingSlots = false;
    });
  }

  DateTime _dateFor(int offset) {
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day).add(Duration(days: offset));
  }

  ({String top, String bottom}) _dayParts(int offset) {
    final date = _dateFor(offset);
    final top = offset == 0
        ? 'Today'
        : offset == 1
            ? 'Tomorrow'
            : DateFormat('EEE').format(date);
    return (top: top, bottom: DateFormat('d MMM').format(date));
  }

  String _dayLabel(int offset) {
    final parts = _dayParts(offset);
    return '${parts.top}, ${parts.bottom}';
  }

  /// Slot labels are free text typed by the admin, so they turn up in several
  /// shapes: "9:00 AM", "1-2pm", "10:00 AM - 12:00 PM". Returns minutes since
  /// midnight, or null when nothing recognisable is in the string.
  int? _minutesFromLabel(String label, bool preferLast) {
    final matches = RegExp(r'(\d{1,2})(?::(\d{2}))?\s*(am|pm)?', caseSensitive: false)
        .allMatches(label)
        .where((m) => m.group(3) != null || m.group(2) != null || RegExp(r'\d').hasMatch(m.group(1) ?? ''))
        .toList();
    if (matches.isEmpty) return null;

    final chosen =
        preferLast && matches.length > 1 ? matches.last : matches.first;
    final period =
        (chosen.group(3) ?? matches.last.group(3) ?? '').toLowerCase();

    var hour = int.tryParse(chosen.group(1) ?? '');
    if (hour == null) return null;
    final minute = int.tryParse(chosen.group(2) ?? '0') ?? 0;

    if (period == 'pm' && hour != 12) hour += 12;
    if (period == 'am' && hour == 12) hour = 0;

    return hour * 60 + minute;
  }

  /// Same-day express shuts at the cutoff hour, whatever slots remain on paper.
  bool get _expressClosedForToday =>
      _expressChosen && DateTime.now().hour >= _charges.expressCutoffHour;

  bool _isSlotPassed(String slotTime, [int? offset]) {
    final day = offset ?? _dayIndex;
    if (day > 0) return false;
    if (_expressClosedForToday) return true;

    final isRange = slotTime.contains('-');
    final slotMinutes = _minutesFromLabel(slotTime, isRange);
    if (slotMinutes == null) return false;

    final now = DateTime.now();
    final nowMinutes = now.hour * 60 + now.minute;
    final lead = _expressChosen ? _charges.expressLeadTimeMinutes : 0;
    return nowMinutes + lead >= slotMinutes;
  }

  bool _dayDisabled(int offset) =>
      (offset == 0 && !_charges.todaySlotsEnabled) ||
      (offset == 1 && !_charges.tomorrowSlotsEnabled);

  bool get _dayClosed => _dayDisabled(_dayIndex);

  bool get _canConfirm => _selectedSlot.isNotEmpty && _garmentConfirmed;

  Future<void> _changeDay(int offset) async {
    setState(() {
      _dayIndex = offset;
      _selectedSlot = '';
    });
    await _fetchSlots(offset);
  }

  void _pickSlot(String slotTime) {
    if (_isSlotPassed(slotTime) && _pickupType == 'now') {
      setState(() => _slotError = true);
      Future.delayed(const Duration(seconds: 3), () {
        if (mounted) setState(() => _slotError = false);
      });
      return;
    }
    setState(() => _selectedSlot = slotTime);
  }

  void _confirm() {
    final draft = _draft;
    if (draft == null || !_canConfirm) return;
    Navigator.of(context).pushNamed(
      '/continue-booking',
      arguments: draft.withSlot(
        pickupType: _pickupType,
        pickupDate: _dateFor(_dayIndex),
        pickupDayLabel: _dayLabel(_dayIndex),
        selectedSlot: _selectedSlot,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final draft = _draft;
    if (draft == null || draft.isEmpty) {
      return const Scaffold(body: SizedBox.shrink());
    }

    final pieces = draft.pieces;

    return Scaffold(
      backgroundColor: Brand.gray50,
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () {
            final navigator = Navigator.of(context);
            if (navigator.canPop()) {
              navigator.pop();
            } else {
              navigator.pushReplacementNamed('/cart');
            }
          },
        ),
        titleSpacing: 0,
        title: const Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Select pickup slot',
              style: TextStyle(
                fontFamily: 'Montserrat',
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: Colors.black,
                height: 1.2,
              ),
            ),
            Text('Step 2 of 2',
                style: TextStyle(fontSize: 11, color: Brand.mutedForeground)),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 14),
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: _expressChosen
                      ? const Color(0xFFFEF3C7)
                      : const Color(0xFFEDE9FE),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  _expressChosen ? 'EXPRESS' : 'STANDARD',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: _expressChosen
                        ? const Color(0xFFB45309)
                        : Brand.purple,
                  ),
                ),
              ),
            ),
          ),
        ],
        shape: const Border(bottom: BorderSide(color: Brand.border)),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _card(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Pickup date',
                          style: TextStyle(fontSize: 12, color: Brand.mutedForeground)),
                      const SizedBox(height: 8),
                      SizedBox(
                        height: 56,
                        child: ListView(
                          scrollDirection: Axis.horizontal,
                          children: [
                            for (var offset = 0; offset < _pickupDays; offset++)
                              Padding(
                                padding: const EdgeInsets.only(right: 8),
                                child: _dayChip(offset),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                _card(child: _slotPicker()),
                const SizedBox(height: 14),
                _card(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Order summary',
                        style: TextStyle(
                          fontFamily: 'Montserrat',
                          fontWeight: FontWeight.w600,
                          fontSize: 15.5,
                        ),
                      ),
                      const SizedBox(height: 10),
                      _summaryRow(
                        '$pieces garment${pieces == 1 ? '' : 's'}',
                        rupees(_itemsTotal),
                      ),
                      if (_expressChosen && _expressFee > 0) ...[
                        const SizedBox(height: 6),
                        _summaryRow(
                            'Express delivery fee', '+${rupees(_expressFee)}'),
                      ],
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 8),
                        child: Divider(height: 1),
                      ),
                      Row(
                        children: [
                          const Expanded(
                            child: Text('Total',
                                style: TextStyle(
                                    fontWeight: FontWeight.w700, fontSize: 15)),
                          ),
                          Text(
                            rupees(_orderTotal),
                            style: const TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 15),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                _card(
                  onTap: () =>
                      setState(() => _garmentConfirmed = !_garmentConfirmed),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        height: 21,
                        width: 21,
                        margin: const EdgeInsets.only(top: 1),
                        decoration: BoxDecoration(
                          gradient: _garmentConfirmed ? Brand.gradient : null,
                          color: _garmentConfirmed ? null : Colors.white,
                          borderRadius: BorderRadius.circular(5),
                          border: _garmentConfirmed
                              ? null
                              : Border.all(color: Brand.disabled, width: 2),
                        ),
                        child: _garmentConfirmed
                            ? const Icon(Icons.check,
                                size: 15, color: Colors.white)
                            : null,
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Text(
                          'I confirm I have added all my clothes for steam ironing.',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            height: 1.4,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                const Text(
                  'Our captain will only pick up the clothes added to your cart '
                  'and confirmed in this order. This helps us maintain '
                  'transparency and ensures your order is processed correctly.',
                  style: TextStyle(fontSize: 12, color: Brand.mutedForeground, height: 1.6),
                ),
              ],
            ),
          ),
          SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: Brand.border)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  GradientButton(
                    label: 'Confirm Order - ${rupees(_orderTotal)}',
                    height: 50,
                    radius: 16,
                    onPressed: _canConfirm ? _confirm : null,
                  ),
                  if (_selectedSlot.isNotEmpty && !_garmentConfirmed)
                    const Padding(
                      padding: EdgeInsets.only(top: 8),
                      child: Text(
                        'Please tick the confirmation above to continue.',
                        style: TextStyle(fontSize: 11, color: Brand.mutedForeground),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _card({required Widget child, VoidCallback? onTap}) {
    final body = Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(color: Color(0x0D000000), blurRadius: 8, offset: Offset(0, 2)),
        ],
      ),
      child: child,
    );
    if (onTap == null) return body;
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: body,
      ),
    );
  }

  Widget _dayChip(int offset) {
    final parts = _dayParts(offset);
    final selected = _dayIndex == offset;
    final disabled = _dayDisabled(offset);

    return Material(
      color: disabled
          ? const Color(0xFFF3F4F6)
          : selected
              ? Colors.transparent
              : Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: disabled ? null : () => _changeDay(offset),
        child: Container(
          constraints: const BoxConstraints(minWidth: 78),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            gradient: (!disabled && selected) ? Brand.gradient : null,
            borderRadius: BorderRadius.circular(16),
            border: (!disabled && !selected)
                ? Border.all(color: const Color(0xFFD1D5DB))
                : null,
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                parts.top,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  color: disabled
                      ? Brand.disabled
                      : selected
                          ? Colors.white70
                          : Brand.purple,
                ),
              ),
              Text(
                parts.bottom,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: disabled
                      ? Brand.disabled
                      : selected
                          ? Colors.white
                          : Brand.purple,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _slotPicker() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Slots for ${_dayLabel(_dayIndex)}',
          style: const TextStyle(
            fontFamily: 'Montserrat',
            fontWeight: FontWeight.w600,
            fontSize: 15.5,
          ),
        ),
        const SizedBox(height: 12),
        if (_dayClosed)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF7ED),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFFED7AA)),
            ),
            child: Column(
              children: [
                Text(
                  'Pickup on ${_dayLabel(_dayIndex)} is currently unavailable.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Color(0xFFEA580C),
                    fontWeight: FontWeight.w600,
                    fontSize: 13.5,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Please pick another day.',
                  style: TextStyle(color: Color(0xFFF97316), fontSize: 12),
                ),
              ],
            ),
          )
        else if (_loadingSlots)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 18),
            child: Center(
              child: SizedBox(
                height: 22,
                width: 22,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          )
        else if (_slots.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Center(
              child: Text('No slots for this day.',
                  style: TextStyle(fontSize: 13.5, color: Brand.mutedForeground)),
            ),
          )
        else
          GridView.count(
            crossAxisCount: 3,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            childAspectRatio: 2.6,
            children: [for (final slot in _slots) _slotChip(slot)],
          ),
        if (_slotError)
          const Padding(
            padding: EdgeInsets.only(top: 12),
            child: Text(
              'That slot has already passed. Please pick a later one.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: Color(0xFFDC2626)),
            ),
          ),
        if (_selectedSlot.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Text(
              'Selected: ${_dayLabel(_dayIndex)}, $_selectedSlot',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Brand.purple,
              ),
            ),
          ),
      ],
    );
  }

  Widget _slotChip(_Slot slot) {
    final gone = _isSlotPassed(slot.time) && _pickupType == 'now';
    final chosen = _selectedSlot == slot.time;
    return Material(
      color: gone
          ? const Color(0xFFE5E7EB)
          : chosen
              ? Colors.transparent
              : Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: gone ? null : () => _pickSlot(slot.time),
        child: Container(
          alignment: Alignment.center,
          padding: const EdgeInsets.symmetric(horizontal: 4),
          decoration: BoxDecoration(
            gradient: (chosen && !gone) ? Brand.gradient : null,
            borderRadius: BorderRadius.circular(16),
            border: (!chosen || gone)
                ? Border.all(color: const Color(0xFFD1D5DB))
                : null,
          ),
          child: Text(
            slot.time,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
              color: gone
                  ? Brand.disabled
                  : chosen
                      ? Colors.white
                      : Colors.black,
            ),
          ),
        ),
      ),
    );
  }

  Widget _summaryRow(String label, String value) {
    return Row(
      children: [
        Expanded(
          child: Text(label,
              style: const TextStyle(fontSize: 14, color: Brand.gray600)),
        ),
        Text(value, style: const TextStyle(fontSize: 14)),
      ],
    );
  }
}
