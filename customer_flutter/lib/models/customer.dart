/// One saved address. Latitude and longitude are where the customer actually
/// dropped the pin -- a typed address alone left the captain searching for a
/// text match, which Google often answered with the wrong end of the street.
class CustomerAddress {
  CustomerAddress({
    required this.street,
    required this.city,
    required this.state,
    required this.pincode,
    this.latitude,
    this.longitude,
    this.isDefault = false,
  });

  final String street;
  final String city;
  final String state;
  final String pincode;
  final double? latitude;
  final double? longitude;
  final bool isDefault;

  bool get hasPin => latitude != null && longitude != null;

  /// How every screen prints an address: "street, city, state - pincode".
  String get oneLine {
    final head =
        [street, city, state].where((p) => p.trim().isNotEmpty).join(', ');
    return pincode.trim().isEmpty ? head : '$head - $pincode';
  }

  /// What a map search needs.
  String get searchQuery =>
      [street, city, state, pincode, 'India']
          .where((p) => p.trim().isNotEmpty)
          .join(', ');

  Map<String, dynamic> toJson() => {
        'street': street,
        'city': city,
        'state': state,
        'pincode': pincode,
        if (latitude != null) 'latitude': latitude,
        if (longitude != null) 'longitude': longitude,
        'isDefault': isDefault,
      };

  factory CustomerAddress.fromJson(Map<String, dynamic> json) =>
      CustomerAddress(
        street: (json['street'] ?? '').toString(),
        city: (json['city'] ?? '').toString(),
        state: (json['state'] ?? '').toString(),
        pincode: (json['pincode'] ?? '').toString(),
        latitude: double.tryParse(json['latitude']?.toString() ?? ''),
        longitude: double.tryParse(json['longitude']?.toString() ?? ''),
        isDefault: json['isDefault'] == true,
      );
}

/// A saved payment method. Only `type` and `upiId` are read by this app -- they
/// are a hint for the Razorpay sheet, nothing more.
class PaymentMethod {
  PaymentMethod({
    required this.type,
    this.upiId,
    this.details,
    this.isPrimary = false,
  });

  final String type;
  final String? upiId;
  final String? details;
  final bool isPrimary;

  factory PaymentMethod.fromJson(Map<String, dynamic> json) => PaymentMethod(
        type: (json['type'] ?? '').toString(),
        upiId: json['upiId']?.toString(),
        details: json['details']?.toString(),
        isPrimary: json['isPrimary'] == true,
      );
}

/// The customer record as /api/mobile/profile returns it.
class CustomerProfile {
  CustomerProfile({
    required this.id,
    required this.name,
    required this.mobile,
    required this.email,
    required this.addresses,
    required this.paymentMethods,
    required this.walletBalance,
    required this.dueAmount,
    required this.loyaltyPoints,
    required this.totalOrders,
    required this.totalSpend,
    required this.referralCodes,
    this.profileImage,
    this.referredBy,
  });

  final String id;
  final String name;
  final String mobile;
  final String email;
  final List<CustomerAddress> addresses;
  final List<PaymentMethod> paymentMethods;
  final num walletBalance;
  final num dueAmount;
  final num loyaltyPoints;
  final num totalOrders;
  final num totalSpend;
  final List<Map<String, dynamic>> referralCodes;
  final String? profileImage;
  final String? referredBy;

  CustomerAddress? get defaultAddress {
    if (addresses.isEmpty) return null;
    for (final a in addresses) {
      if (a.isDefault) return a;
    }
    return addresses.first;
  }

  PaymentMethod? get primaryPaymentMethod {
    for (final m in paymentMethods) {
      if (m.isPrimary) return m;
    }
    return null;
  }

  /// A phone signup that has not been filled in yet, or a Google/Apple account
  /// carrying a placeholder mobile.
  bool get hasRealMobile =>
      mobile.isNotEmpty &&
      !mobile.startsWith('google_') &&
      !mobile.startsWith('apple_');

  static num _num(Object? v) =>
      v is num ? v : (num.tryParse(v?.toString() ?? '') ?? 0);

  factory CustomerProfile.fromJson(Map<String, dynamic> json) {
    List<T> listOf<T>(Object? raw, T Function(Map<String, dynamic>) make) =>
        raw is List
            ? raw
                .whereType<Map>()
                .map((m) => make(Map<String, dynamic>.from(m)))
                .toList()
            : <T>[];

    return CustomerProfile(
      id: (json['_id'] ?? json['customerId'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      mobile: (json['mobile'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      addresses: listOf(json['address'], CustomerAddress.fromJson),
      paymentMethods: listOf(json['paymentMethods'], PaymentMethod.fromJson),
      walletBalance: _num(json['walletBalance']),
      dueAmount: _num(json['dueAmount']),
      loyaltyPoints: _num(json['loyaltyPoints']),
      totalOrders: _num(json['totalOrders']),
      totalSpend: _num(json['totalSpend']),
      referralCodes: (json['referralCodes'] is List)
          ? (json['referralCodes'] as List)
              .whereType<Map>()
              .map((m) => Map<String, dynamic>.from(m))
              .toList()
          : <Map<String, dynamic>>[],
      profileImage: json['profileImage']?.toString(),
      referredBy: json['referredBy']?.toString(),
    );
  }
}
