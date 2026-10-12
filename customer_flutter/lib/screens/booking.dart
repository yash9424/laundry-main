import 'dart:async';

import 'package:flutter/material.dart';

import '../models/catalogue.dart';
import '../models/checkout.dart';
import '../models/customer.dart';
import '../models/order_charges.dart';
import '../services/api.dart';
import '../services/cart.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/common.dart';
import '../widgets/lucide.dart';

/// `shadow-lg`, `shadow-md` and `shadow-2xl`.
const _shadowLg = [
  BoxShadow(color: Color(0x1A000000), blurRadius: 15, offset: Offset(0, 10)),
];
const _shadowMd = [
  BoxShadow(color: Color(0x1A000000), blurRadius: 6, offset: Offset(0, 4)),
];
const _orange50 = Color(0xFFFFF7ED);
const _orange200 = Color(0xFFFED7AA);
const _orange500 = Color(0xFFF97316);
const _orange600 = Color(0xFFEA580C);
const _red50 = Color(0xFFFEF2F2);
const _red200 = Color(0xFFFECACA);
const _red700 = Color(0xFFB91C1C);

class _Slot {
  const _Slot(this.id, this.time);

  final String id;
  final String time;
}

/// `/booking` -- "Book Your Order", the screen the app booked on before the
/// catalogue and the cart replaced it.
///
/// Nothing in the live flow points here: Prices -> Cart -> Continue Booking is
/// what customers walk through. But the bottom bars on Wallet and Refer & Earn
/// were never moved over, and their middle button still opens this screen, so
/// it is reachable in the shipped app and is carried here for that reason.
///
/// It is the older code and it shows -- the clock that greys out passed slots
/// cannot read minutes (see `_isSlotPassed`), and the quantities counted here
/// are separate from the cart until "Add to Cart" is tapped. Both are kept.
class BookingScreen extends StatefulWidget {
  const BookingScreen({super.key});

  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  /// 'now' for today, 'later' for tomorrow. This screen offers no other day.
  String _pickupType = 'now';

  List<PricingItem> _items = [];
  List<String> _categories = [];
  String _selectedCategory = 'All';
  final Map<String, int> _quantities = {};

  List<_Slot> _slots = [];
  String _selectedSlot = '';
  bool _slotError = false;

  bool _todayEnabled = true;
  bool _tomorrowEnabled = true;

  CustomerAddress? _address;
  List<CustomerAddress> _saved = [];

  /// This screen's own default, which is not the one the catalogue uses.
  num _minOrderPrice = 500;

  String _toastMessage = '';
  bool _toastIsError = false;
  Timer? _toastTimer;

  @override
  void initState() {
    super.initState();
    _readCachedAddress();
    _fetchPricing();
    _fetchSlots();
    _fetchAddress();
    _fetchDaySettings();
  }

  @override
  void dispose() {
    _toastTimer?.cancel();
    super.dispose();
  }

  /// The address shows from the cache first so the card is never empty while
  /// the profile call is in the air, exactly as the web screen seeds its state
  /// from localStorage.
  void _readCachedAddress() {
    final cachedOne = Store.getJson(Store.kCachedBookingAddress);
    if (cachedOne is Map) {
      _address = CustomerAddress.fromJson(Map<String, dynamic>.from(cachedOne));
    }
    final cachedAll = Store.getJson(Store.kCachedSavedAddresses);
    if (cachedAll is List) {
      _saved = cachedAll
          .whereType<Map>()
          .map((m) => CustomerAddress.fromJson(Map<String, dynamic>.from(m)))
          .toList();
    }
  }

  Future<void> _fetchPricing() async {
    final results = await Future.wait([
      Api.pricingItems(),
      Api.walletSettings(),
    ]);
    if (!mounted) return;

    final pricing = results[0];
    final settings = results[1];

    setState(() {
      if (pricing.ok) {
        _items = pricing.list
            .whereType<Map>()
            .map((m) => PricingItem.fromJson(Map<String, dynamic>.from(m)))
            .toList();
        _categories = ['All', ..._items.map((i) => i.category).toSet()];
        _quantities
          ..clear()
          ..addEntries(_items.map((i) => MapEntry(i.id, 0)));
      }
      if (settings.ok) {
        final min = settings.map['minOrderPrice'];
        if (min is num) _minOrderPrice = min;
      }
    });
  }

  Future<void> _fetchDaySettings() async {
    final result = await Api.orderCharges();
    if (!mounted || !result.ok) return;
    final charges = OrderChargesConfig.fromJson(result.map);
    setState(() {
      _todayEnabled = charges.todaySlotsEnabled;
      _tomorrowEnabled = charges.tomorrowSlotsEnabled;
    });
  }

  Future<void> _fetchSlots() async {
    final result = await Api.timeSlots(
      day: _pickupType == 'now' ? 'today' : 'tomorrow',
    );
    if (!mounted || !result.ok) return;

    final slots = result.list
        .whereType<Map>()
        .map(
          (m) =>
              _Slot((m['_id'] ?? '').toString(), (m['time'] ?? '').toString()),
        )
        .toList();
    final available = slots.where((s) => !_isSlotPassed(s.time)).toList();

    setState(() {
      _slots = slots;
      _selectedSlot = available.isNotEmpty ? available.first.time : '';
    });
  }

  Future<void> _fetchAddress() async {
    final customerId = Store.customerId;
    if (customerId == null) return;

    final result = await Api.profile(
      customerId,
      timeout: const Duration(seconds: 2),
    );
    if (!mounted || !result.ok) return;

    final addresses = CustomerProfile.fromJson(result.map).addresses;
    if (addresses.isEmpty) return;

    final primary = addresses.firstWhere(
      (a) => a.isDefault,
      orElse: () => addresses.first,
    );
    setState(() {
      _saved = addresses;
      _address = primary;
    });
    await Store.setJson(
      Store.kCachedSavedAddresses,
      addresses.map((a) => a.toJson()).toList(),
    );
    await Store.setJson(Store.kCachedBookingAddress, primary.toJson());
  }

  /// Whether a slot has already gone by.
  ///
  /// This is the web screen's own clock, kept as it is. It reads the hour at
  /// each end of the label and ignores minutes entirely, so "10:00 AM - 12:00
  /// PM" matches no part of the pattern and is never treated as passed. The
  /// newer slot screen has its own, stricter version; this one belongs to this
  /// screen, and changing it would change what can be booked here.
  bool _isSlotPassed(String slotTime) {
    if (_pickupType == 'later') return false;

    final match = RegExp(
      r'(\d+)\s*(AM|PM)?\s*-\s*(\d+)\s*(AM|PM)',
      caseSensitive: false,
    ).firstMatch(slotTime);
    if (match == null) return false;

    final endHour = int.tryParse(match.group(3) ?? '') ?? 0;
    final endPeriod = match.group(4)?.toUpperCase();

    var slotEndHour = endHour;
    if (endPeriod == 'PM' && endHour != 12) {
      slotEndHour = endHour + 12;
    } else if (endPeriod == 'AM' && endHour == 12) {
      slotEndHour = 0;
    }

    final now = DateTime.now();
    return now.hour > slotEndHour ||
        (now.hour == slotEndHour && now.minute > 0);
  }

  void _pickSlot(String time) {
    if (_isSlotPassed(time) && _pickupType == 'now') {
      setState(() => _slotError = true);
      Timer(const Duration(seconds: 3), () {
        if (mounted) setState(() => _slotError = false);
      });
      return;
    }
    setState(() => _selectedSlot = time);
  }

  void _setPickupType(String type) {
    if (_pickupType == type) return;
    setState(() => _pickupType = type);
    _fetchSlots();
  }

  List<PricingItem> get _filteredItems => _selectedCategory == 'All'
      ? _items
      : _items.where((i) => i.category == _selectedCategory).toList();

  List<PricingItem> get _chosenItems =>
      _items.where((i) => (_quantities[i.id] ?? 0) > 0).toList();

  num get _total => _items.fold<num>(
    0,
    (sum, item) => sum + item.price * (_quantities[item.id] ?? 0),
  );

  void _updateQuantity(String id, bool increment) {
    setState(() {
      final next = (_quantities[id] ?? 0) + (increment ? 1 : -1);
      _quantities[id] = next < 0 ? 0 : next;
    });
  }

  Future<void> _addToCart() async {
    final chosen = _chosenItems;
    if (chosen.isEmpty) {
      _showToast('Please select at least one item', error: true);
      return;
    }

    // Quantities are added to whatever is already in the cart rather than
    // replacing it, which is what the web screen's merge does.
    for (final item in chosen) {
      await Cart.setQuantity(
        id: item.id,
        name: item.name,
        price: item.price,
        category: item.category,
        quantity: Cart.quantityOf(item.id) + (_quantities[item.id] ?? 0),
      );
    }
    if (!mounted) return;

    _showToast('${chosen.length} item(s) added to cart!');
    setState(() {
      for (final item in _items) {
        _quantities[item.id] = 0;
      }
    });
  }

  void _confirmOrder() {
    if (_address == null) {
      _showToast('Please select a delivery address', error: true);
      return;
    }

    // No pickup date goes with this: the web screen sends only the type, and
    // Continue Booking works today or tomorrow out from it.
    Navigator.of(context).pushNamed(
      '/continue-booking',
      arguments: CheckoutDraft(
        items: _chosenItems
            .map(
              (item) => CartLine(
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: _quantities[item.id] ?? 0,
                category: item.category,
              ),
            )
            .toList(),
        itemsTotal: _total,
        pickupType: _pickupType,
        selectedSlot: _selectedSlot,
      ),
    );
  }

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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Brand.gray50,
      appBar: AppHeader(
        title: 'Book Your Order',
        action: GestureDetector(
          onTap: _addToCart,
          behavior: HitTestBehavior.opaque,
          child: SizedBox(
            height: 36,
            width: 36,
            child: Center(
              child: ShaderMask(
                shaderCallback: (bounds) => Brand.gradient.createShader(
                  Rect.fromLTWH(0, 0, bounds.width, bounds.height),
                ),
                child: const Icon(
                  Icons.shopping_cart_outlined,
                  size: 20, // w-5 h-5
                  color: Colors.white,
                ),
              ),
            ),
          ),
        ),
      ),
      bottomNavigationBar: const AppBottomNav(current: '/booking'),
      body: Stack(
        children: [
          ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24), // px-4 py-4
            children: [
              _catalogue(),
              const SizedBox(height: 16), // space-y-4
              _daySection(),
              const SizedBox(height: 16),
              _slotSection(),
              const SizedBox(height: 16),
              _addressSection(),
              const SizedBox(height: 16),
              _summary(),
              const SizedBox(height: 16),
              if (_slotError) ...[
                _slotErrorBanner(),
                const SizedBox(height: 16),
              ],
              _confirmButton(),
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

  // ---- the catalogue -------------------------------------------------------

  Widget _catalogue() => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      if (_categories.isNotEmpty) ...[
        SizedBox(
          height: 32, // h-8
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: _categories.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8), // gap-2
            itemBuilder: (_, index) => _categoryChip(_categories[index]),
          ),
        ),
        const SizedBox(height: 28), // pb-3 + mb-4
      ],
      Container(
        padding: const EdgeInsets.all(12), // p-3
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(Brand.r2xl),
          boxShadow: _shadowLg,
        ),
        child: Column(
          children: [
            for (var i = 0; i < _filteredItems.length; i++) ...[
              if (i > 0) const SizedBox(height: 12), // space-y-3
              _itemRow(_filteredItems[i]),
            ],
          ],
        ),
      ),
      const SizedBox(height: 16), // mt-4
      _addToCartButton(),
    ],
  );

  Widget _categoryChip(String category) {
    final chosen = _selectedCategory == category;
    return GestureDetector(
      onTap: () => setState(() => _selectedCategory = category),
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12), // px-3
        alignment: Alignment.center,
        decoration: BoxDecoration(
          gradient: chosen ? Brand.gradient : null,
          color: chosen ? null : Colors.white,
          borderRadius: BorderRadius.circular(Brand.r2xl),
          border: chosen ? null : Border.all(color: Brand.gray300),
          boxShadow: chosen ? _shadowMd : null,
        ),
        child: Text(
          category,
          style: TextStyle(
            fontFamily: Brand.heading,
            fontSize: 12, // text-xs
            fontWeight: FontWeight.w600,
            color: chosen ? Colors.white : Brand.gray700,
          ),
        ),
      ),
    );
  }

  Widget _itemRow(PricingItem item) {
    final quantity = _quantities[item.id] ?? 0;
    return Row(
      children: [
        Container(
          height: 40, // w-10 h-10
          width: 40,
          decoration: BoxDecoration(
            gradient: Brand.gradient,
            borderRadius: BorderRadius.circular(Brand.rXl),
          ),
          child: Center(child: Lucide.shirt(size: 20, color: Colors.white)),
        ),
        const SizedBox(width: 8), // gap-2
        Expanded(
          child: Row(
            children: [
              Flexible(
                child: Text(
                  '${item.name} ',
                  style: const TextStyle(
                    fontSize: 14, // text-sm
                    fontWeight: FontWeight.w600,
                    color: Colors.black,
                  ),
                ),
              ),
              GradientText(
                rupees(item.price),
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 12), // gap-3
        _stepperButton(Icons.remove, () => _updateQuantity(item.id, false)),
        const SizedBox(width: 8),
        SizedBox(
          width: 24, // w-6
          child: Text(
            '$quantity',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Colors.black,
            ),
          ),
        ),
        const SizedBox(width: 8),
        _stepperButton(Icons.add, () => _updateQuantity(item.id, true)),
      ],
    );
  }

  Widget _stepperButton(IconData icon, VoidCallback onTap) => GestureDetector(
    onTap: onTap,
    behavior: HitTestBehavior.opaque,
    child: Container(
      height: 28, // w-7 h-7
      width: 28,
      decoration: BoxDecoration(
        gradient: Brand.gradient,
        borderRadius: BorderRadius.circular(Brand.rLg),
        boxShadow: _shadowMd,
      ),
      child: Icon(icon, size: 12, color: Colors.white), // w-3 h-3
    ),
  );

  Widget _addToCartButton() => GestureDetector(
    onTap: _addToCart,
    behavior: HitTestBehavior.opaque,
    child: Container(
      height: 48, // h-12
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: Brand.gray300, width: 2),
        borderRadius: BorderRadius.circular(Brand.r2xl),
        boxShadow: _shadowLg,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.shopping_cart_outlined,
            size: 16, // w-4 h-4
            color: Brand.gray700,
          ),
          const SizedBox(width: 8), // gap-2
          Text(
            'Add to Cart',
            style: TextStyle(
              fontFamily: Brand.heading,
              fontSize: 14, // text-sm
              fontWeight: FontWeight.w600,
              color: Brand.gray700,
            ),
          ),
        ],
      ),
    ),
  );

  // ---- the day and the slot ------------------------------------------------

  Widget _daySection() => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      _heading('Select Pickup Day'),
      Row(
        children: [
          Expanded(child: _dayButton('Today', 'now')),
          const SizedBox(width: 8), // gap-2
          Expanded(child: _dayButton('Tomorrow', 'later')),
        ],
      ),
    ],
  );

  Widget _dayButton(String label, String type) {
    final chosen = _pickupType == type;
    return GestureDetector(
      onTap: () => _setPickupType(type),
      behavior: HitTestBehavior.opaque,
      child: Container(
        height: 40, // h-10
        alignment: Alignment.center,
        decoration: BoxDecoration(
          gradient: chosen ? Brand.gradient : null,
          color: chosen ? null : Colors.white,
          borderRadius: BorderRadius.circular(Brand.r2xl),
          border: chosen ? null : Border.all(color: Brand.gray300),
          boxShadow: _shadowMd,
        ),
        child: Text(
          label,
          style: TextStyle(
            fontFamily: Brand.heading,
            fontSize: 14, // text-sm
            fontWeight: FontWeight.w600,
            color: chosen ? Colors.white : Brand.purple,
          ),
        ),
      ),
    );
  }

  Widget _slotSection() {
    final dayOff =
        (_pickupType == 'now' && !_todayEnabled) ||
        (_pickupType == 'later' && !_tomorrowEnabled);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _heading(
          "${_pickupType == 'now' ? "Today's" : "Tomorrow's"} Pickup Slots",
        ),
        if (dayOff)
          Container(
            padding: const EdgeInsets.all(16), // p-4
            decoration: BoxDecoration(
              color: _orange50,
              border: Border.all(color: _orange200),
              borderRadius: BorderRadius.circular(Brand.r2xl),
            ),
            child: Column(
              children: [
                Text(
                  '${_pickupType == 'now' ? 'Today' : 'Tomorrow'} pickup is '
                  'currently unavailable.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 14, // text-sm
                    fontWeight: FontWeight.w600,
                    color: _orange600,
                  ),
                ),
                const SizedBox(height: 4), // mt-1
                const Text(
                  'Please select the other day or try again later.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12, color: _orange500),
                ),
              ],
            ),
          )
        else ...[
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            padding: EdgeInsets.zero,
            itemCount: _slots.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              mainAxisSpacing: 8, // gap-2
              crossAxisSpacing: 8,
              mainAxisExtent: 40, // h-10
            ),
            itemBuilder: (_, index) => _slotButton(_slots[index]),
          ),
          if (_selectedSlot.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8), // mt-2
              child: GradientText(
                'Selected: ${_pickupType == 'now' ? 'Today' : 'Tomorrow'}, '
                '$_selectedSlot',
                style: const TextStyle(fontSize: 12), // text-xs
              ),
            ),
        ],
      ],
    );
  }

  Widget _slotButton(_Slot slot) {
    final gone = _isSlotPassed(slot.time) && _pickupType == 'now';
    final chosen = _selectedSlot == slot.time;
    return GestureDetector(
      onTap: gone ? null : () => _pickSlot(slot.time),
      behavior: HitTestBehavior.opaque,
      child: Container(
        alignment: Alignment.center,
        decoration: BoxDecoration(
          gradient: (chosen && !gone) ? Brand.gradient : null,
          color: gone
              ? Brand.gray200
              : chosen
              ? null
              : Colors.white,
          borderRadius: BorderRadius.circular(Brand.r2xl),
          border: (gone || !chosen) ? Border.all(color: Brand.gray300) : null,
          boxShadow: (chosen && !gone) ? _shadowMd : null,
        ),
        child: Text(
          slot.time,
          // `whitespace-nowrap` on the button: a long label runs past its own
          // edge rather than wrapping, which is what the web screen shows.
          softWrap: false,
          overflow: TextOverflow.visible,
          style: TextStyle(
            fontFamily: Brand.heading,
            fontSize: 14, // text-sm
            fontWeight: FontWeight.w600,
            color: gone
                ? Brand.gray400
                : chosen
                ? Colors.white
                : Colors.black,
          ),
        ),
      ),
    );
  }

  // ---- the address ---------------------------------------------------------

  Widget _addressSection() => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      _heading('Pickup & Delivery Address'),
      Container(
        padding: const EdgeInsets.all(12), // p-3
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(Brand.r2xl),
          boxShadow: _shadowLg,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 2), // mt-0.5
              child: ShaderMask(
                shaderCallback: (bounds) => Brand.gradient.createShader(
                  Rect.fromLTWH(0, 0, bounds.width, bounds.height),
                ),
                child: const Icon(
                  Icons.location_on_outlined,
                  size: 16, // w-4 h-4
                  color: Colors.white,
                ),
              ),
            ),
            const SizedBox(width: 8), // gap-2
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: _address == null
                    ? const [
                        Text(
                          'No address found',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Colors.black,
                          ),
                        ),
                        Text(
                          'Please add an address',
                          style: TextStyle(fontSize: 12, color: Brand.gray500),
                        ),
                      ]
                    : [
                        Text(
                          '${_address!.street},',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Colors.black,
                          ),
                        ),
                        Text(
                          '${_address!.city}, ${_address!.state} - '
                          '${_address!.pincode}',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Colors.black,
                          ),
                        ),
                      ],
              ),
            ),
            const SizedBox(width: 12), // gap-3
            GestureDetector(
              onTap: _saved.isNotEmpty ? _showAddressSheet : _openAddAddress,
              behavior: HitTestBehavior.opaque,
              child: GradientText(
                _saved.isNotEmpty ? 'Change' : 'Add',
                style: const TextStyle(
                  fontSize: 12, // text-xs
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    ],
  );

  Future<void> _openAddAddress() async {
    await Navigator.of(context).pushNamed('/add-address');
    if (!mounted) return;
    // The web screen is unmounted while Add Address is open and re-reads the
    // profile when it comes back, so a new address shows without a reload.
    await _fetchAddress();
  }

  void _showAddressSheet() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      barrierColor: const Color(0x80000000), // bg-black bg-opacity-50
      isScrollControlled: true,
      builder: (sheetContext) => Container(
        constraints: BoxConstraints(
          maxHeight:
              MediaQuery.of(sheetContext).size.height * 0.8, // max-h-[80vh]
        ),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(Brand.r3xl)),
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16), // p-4
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Select Address',
                style: TextStyle(
                  fontFamily: Brand.heading,
                  fontSize: 18, // text-lg
                  fontWeight: FontWeight.w700,
                  color: Colors.black,
                ),
              ),
              const SizedBox(height: 16), // mb-4
              for (final address in _saved) ...[
                _addressTile(sheetContext, address),
                const SizedBox(height: 12), // space-y-3
              ],
              GestureDetector(
                onTap: () {
                  Navigator.of(sheetContext).pop();
                  _openAddAddress();
                },
                behavior: HitTestBehavior.opaque,
                child: CustomPaint(
                  painter: const DashedBorderPainter(
                    color: Color(0xFF9B7DD4),
                    radius: Brand.r2xl,
                    strokeWidth: 2,
                  ),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12), // py-3
                    alignment: Alignment.center,
                    child: const GradientText(
                      '+ Add New Address',
                      // A <button> with no size utility, so index.css's base
                      // rule for buttons applies: text-xs.
                      style: TextStyle(
                        fontFamily: Brand.heading,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _addressTile(BuildContext sheetContext, CustomerAddress address) {
    // The web screen compares the street and the city, not the whole address.
    final chosen =
        _address?.street == address.street && _address?.city == address.city;
    return GestureDetector(
      onTap: () {
        setState(() => _address = address);
        Navigator.of(sheetContext).pop();
      },
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.all(16), // p-4
        decoration: BoxDecoration(
          color: chosen ? const Color(0xFFF0EBF8) : null,
          border: Border.all(
            color: chosen ? Brand.purple : Brand.gray200,
            width: 2, // border-2
          ),
          borderRadius: BorderRadius.circular(Brand.r2xl),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 2), // mt-0.5
              child: ShaderMask(
                shaderCallback: (bounds) => Brand.gradient.createShader(
                  Rect.fromLTWH(0, 0, bounds.width, bounds.height),
                ),
                child: const Icon(
                  Icons.location_on_outlined,
                  size: 20, // w-5 h-5
                  color: Colors.white,
                ),
              ),
            ),
            const SizedBox(width: 12), // gap-3
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    address.street,
                    style: const TextStyle(
                      fontSize: 14, // text-sm
                      fontWeight: FontWeight.w600,
                      color: Colors.black,
                    ),
                  ),
                  Text(
                    '${address.city}, ${address.state} - ${address.pincode}',
                    style: const TextStyle(fontSize: 12, color: Brand.gray600),
                  ),
                  if (address.isDefault)
                    const GradientText(
                      'Primary',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
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

  // ---- the summary and the button -----------------------------------------

  Widget _summary() {
    final chosen = _chosenItems;
    final itemsText = chosen.isEmpty
        ? 'No items selected'
        : chosen.map((i) => '${_quantities[i.id]} ${i.name}').join(', ');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _heading('Order Summary'),
        Container(
          padding: const EdgeInsets.all(12), // p-3
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(Brand.r2xl),
            boxShadow: _shadowLg,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Items: $itemsText',
                style: const TextStyle(fontSize: 12, color: Colors.black),
              ),
              const SizedBox(height: 8), // space-y-2
              const Text(
                'Service: Steam Iron',
                style: TextStyle(fontSize: 12, color: Colors.black),
              ),
              const SizedBox(height: 8),
              Text(
                'Minimum Order Value: ${rupees(_minOrderPrice)}',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Colors.black,
                ),
              ),
              const SizedBox(height: 8),
              const Divider(height: 1, thickness: 1, color: Brand.border),
              const SizedBox(height: 8), // pt-2
              GradientText(
                'Estimated Total: ${rupees(_total)}',
                style: const TextStyle(
                  fontFamily: Brand.heading,
                  fontSize: 16, // text-base
                  fontWeight: FontWeight.w700,
                ),
              ),
              if (_total < _minOrderPrice)
                Padding(
                  padding: const EdgeInsets.only(top: 4), // mt-1
                  child: Text(
                    '⚠ Minimum order value of ${rupees(_minOrderPrice)} '
                    'required',
                    style: const TextStyle(
                      fontSize: 12, // text-xs
                      fontWeight: FontWeight.w600,
                      color: Brand.red500,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _slotErrorBanner() => Container(
    padding: const EdgeInsets.all(12), // p-3
    decoration: BoxDecoration(
      color: _red50,
      border: Border.all(color: _red200),
      borderRadius: BorderRadius.circular(Brand.r2xl),
    ),
    child: const Text(
      '⏰ This time slot has already passed. Please select an available time '
      'slot.',
      textAlign: TextAlign.center,
      style: TextStyle(
        fontSize: 14, // text-sm
        fontWeight: FontWeight.w500,
        color: _red700,
      ),
    ),
  );

  Widget _confirmButton() {
    final enabled = _total >= _minOrderPrice;
    return GradientButton(
      label: 'Confirm Order',
      height: 48, // h-12
      fontSize: 14, // text-sm
      // Below the minimum it is a flat `bg-gray-300` with a grey label, not
      // the faded gradient the newer screens use.
      disabledLook: DisabledLook.flatGrey300,
      disabledLabelColour: Brand.gray500,
      onPressed: enabled ? _confirmOrder : null,
    );
  }

  Widget _heading(String text) => Padding(
    padding: const EdgeInsets.only(bottom: 12), // mb-3
    child: Text(
      text,
      style: const TextStyle(
        fontFamily: Brand.heading,
        fontSize: 16, // text-base
        fontWeight: FontWeight.w700,
        color: Colors.black,
      ),
    ),
  );
}
