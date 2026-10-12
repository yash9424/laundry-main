/// The parts of an Order the Captain app looks at.
///
/// The raw map is kept alongside the typed fields: several screens PATCH an
/// order by spreading values they never read, and the backend accepts whatever
/// JSON it is sent, so throwing away the rest of the document would quietly
/// change what gets written back.
class PartnerOrder {
  PartnerOrder(this.raw);

  final Map<String, dynamic> raw;

  static String _str(Object? value) => value?.toString() ?? '';

  /// Mongo's `_id`. Most PATCH calls from the app use this rather than the
  /// five-character `orderId` the customer sees.
  String get id => _str(raw['_id']);

  /// The short code shown to people, e.g. `US1001`.
  String get orderId => _str(raw['orderId']);

  String get status => _str(raw['status']);

  num get totalAmount => raw['totalAmount'] is num
      ? raw['totalAmount'] as num
      : num.tryParse(_str(raw['totalAmount'])) ?? 0;

  bool get expressDelivery => raw['expressDelivery'] == true;

  String get paymentStatus => _str(raw['paymentStatus']);
  String get paymentMethod => _str(raw['paymentMethod']);

  /// `customerId` comes back populated on the list routes and as a bare id on
  /// others, so both shapes have to be handled.
  Map<String, dynamic> get _customer => raw['customerId'] is Map
      ? Map<String, dynamic>.from(raw['customerId'] as Map)
      : const {};

  String get customerName {
    final name = _str(_customer['name']);
    return name.isEmpty ? 'Customer' : name;
  }

  String get customerMobile => _str(_customer['mobile']);

  /// The partner this order belongs to, whether populated or not.
  String get partnerId {
    final value = raw['partnerId'];
    if (value is Map) return _str(value['_id']);
    return _str(value);
  }

  bool get hasPartner => partnerId.isNotEmpty;

  OrderAddress get pickupAddress => OrderAddress(raw['pickupAddress']);
  OrderAddress get deliveryAddress =>
      raw['deliveryAddress'] == null && raw['pickupAddress'] != null
          ? OrderAddress(raw['pickupAddress'])
          : OrderAddress(raw['deliveryAddress']);

  Map<String, dynamic> get _pickupSlot => raw['pickupSlot'] is Map
      ? Map<String, dynamic>.from(raw['pickupSlot'] as Map)
      : const {};

  String get pickupSlotDate => _str(_pickupSlot['date']);
  String get pickupSlotTime => _str(_pickupSlot['timeSlot']);

  Map<String, dynamic> get _deliverySlot => raw['deliverySlot'] is Map
      ? Map<String, dynamic>.from(raw['deliverySlot'] as Map)
      : const {};

  String get deliverySlotDate => _str(_deliverySlot['date']);
  String get deliverySlotTime => _str(_deliverySlot['timeSlot']);

  /// The hub is populated on some routes and a bare id on others.
  String get hubName {
    final hub = raw['hub'];
    if (hub is Map) return _str(hub['name']);
    return '';
  }

  List<OrderItem> get items => (raw['items'] is List)
      ? (raw['items'] as List)
          .whereType<Map>()
          .map((item) => OrderItem(Map<String, dynamic>.from(item)))
          .toList()
      : const [];

  int get itemCount => items.fold<int>(0, (sum, item) => sum + item.quantity);

  String get specialInstructions => _str(raw['specialInstructions']);
  String get pickupNotes => _str(raw['pickupNotes']);

  List<String> get pickupPhotos => (raw['pickupPhotos'] is List)
      ? (raw['pickupPhotos'] as List)
          .map(_str)
          .where((p) => p.isNotEmpty)
          .toList()
      : const [];

  // Redelivery flags, which decide where an order shows up in the hub and
  // delivery screens.
  bool get returnToHubRequested => raw['returnToHubRequested'] == true;
  bool get returnToHubApproved => raw['returnToHubApproved'] == true;
  bool get redeliveryReturnRequested =>
      raw['redeliveryReturnRequested'] == true;
  bool get redeliveryScheduled => raw['redeliveryScheduled'] == true;
  bool get orderSuspended => raw['orderSuspended'] == true;

  DateTime? get createdAt => DateTime.tryParse(_str(raw['createdAt']));
  DateTime? get deliveredAt => DateTime.tryParse(_str(raw['deliveredAt']));
  DateTime? get pickedUpAt => DateTime.tryParse(_str(raw['pickedUpAt']));
}

class OrderItem {
  OrderItem(this.raw);

  final Map<String, dynamic> raw;

  String get name => raw['name']?.toString() ?? '';
  int get quantity =>
      raw['quantity'] is num ? (raw['quantity'] as num).toInt() : 1;
  num get price => raw['price'] is num
      ? raw['price'] as num
      : num.tryParse('${raw['price']}') ?? 0;
}

class OrderAddress {
  OrderAddress(Object? value)
      : _map = value is Map ? Map<String, dynamic>.from(value) : const {};

  final Map<String, dynamic> _map;

  String get street => _map['street']?.toString() ?? '';
  String get city => _map['city']?.toString() ?? '';
  String get state => _map['state']?.toString() ?? '';
  String get pincode => _map['pincode']?.toString() ?? '';

  bool get isEmpty => street.isEmpty && city.isEmpty && pincode.isEmpty;

  /// What the cards print: "street, city".
  String get shortLine => [street, city].where((p) => p.isNotEmpty).join(', ');

  /// The whole thing, for the maps link and the detail screens.
  String get oneLine {
    final tail = [city, state].where((p) => p.isNotEmpty).join(', ');
    final withPin = pincode.isEmpty ? tail : '$tail - $pincode';
    return [street, withPin].where((p) => p.isNotEmpty).join(', ');
  }

  /// What gets handed to a maps search.
  String get searchQuery => [street, city, state, pincode, 'India']
      .where((p) => p.trim().isNotEmpty)
      .join(', ');
}
