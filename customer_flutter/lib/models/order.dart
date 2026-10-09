import 'customer.dart';

num _num(Object? v) => v is num ? v : (num.tryParse(v?.toString() ?? '') ?? 0);

DateTime? _date(Object? v) {
  final s = v?.toString();
  if (s == null || s.isEmpty) return null;
  return DateTime.tryParse(s)?.toLocal();
}

class OrderItem {
  OrderItem({required this.name, required this.quantity, required this.price});

  final String name;
  final int quantity;
  final num price;

  num get lineTotal => price * quantity;

  factory OrderItem.fromJson(Map<String, dynamic> json) => OrderItem(
        name: (json['name'] ?? '').toString(),
        quantity: int.tryParse(json['quantity']?.toString() ?? '') ?? 0,
        price: _num(json['price']),
      );
}

/// What the order cost and how it was paid.
///
/// Newer orders carry the breakdown the server worked out. Older ones have
/// none, so the discount is derived from the total and the wallet/online split
/// is simply unknown -- which is better shown as absent than as zero.
class OrderBreakdown {
  const OrderBreakdown({
    required this.subtotal,
    required this.express,
    required this.due,
    required this.discount,
    required this.total,
    required this.wallet,
    required this.paidOnline,
  });

  final num subtotal;
  final num express;
  final num due;
  final num discount;
  final num total;
  final num wallet;

  /// null when the order predates the saved breakdown.
  final num? paidOnline;
}

/// The central document. Only the fields the customer app reads are mapped;
/// `raw` keeps everything else for the invoice, which prints a few extras.
class CustomerOrder {
  CustomerOrder({
    required this.id,
    required this.orderId,
    required this.status,
    required this.items,
    required this.totalAmount,
    required this.createdAt,
    required this.raw,
    this.partnerId,
    this.pickupAddress,
    this.pickupSlotLabel,
    this.pickupSlotDate,
    this.paymentMethod,
    this.paymentStatus,
    this.expressDelivery = false,
    this.expressDeliveryFee = 0,
    this.previousDuePaid = 0,
    this.cancellationFee = 0,
    this.cancellationReason,
    this.deliveryFailureFee = 0,
    this.deliveryFailureReason,
    this.suspensionReason,
    this.redeliveryScheduled = false,
    this.appliedVoucherCode,
    this.specialInstructions,
    this.issue,
    this.reachedLocationAt,
    this.pickedUpAt,
    this.deliveredToHubAt,
    this.processCompletedAt,
    this.outForDeliveryAt,
    this.outForRedeliveryAt,
    this.deliveredAt,
    this.deliveryFailedAt,
    this.expectedDeliveryAt,
  });

  final String id;
  final String orderId;
  final String status;
  final List<OrderItem> items;
  final num totalAmount;
  final DateTime? createdAt;
  final Map<String, dynamic> raw;

  /// Either an id string or a populated partner object, depending on the route.
  final String? partnerId;

  final CustomerAddress? pickupAddress;
  final String? pickupSlotLabel;
  final DateTime? pickupSlotDate;
  final String? paymentMethod;
  final String? paymentStatus;

  final bool expressDelivery;
  final num expressDeliveryFee;
  final num previousDuePaid;
  final num cancellationFee;
  final String? cancellationReason;
  final num deliveryFailureFee;
  final String? deliveryFailureReason;
  final String? suspensionReason;
  final bool redeliveryScheduled;
  final String? appliedVoucherCode;
  final String? specialInstructions;
  final String? issue;

  final DateTime? reachedLocationAt;
  final DateTime? pickedUpAt;
  final DateTime? deliveredToHubAt;
  final DateTime? processCompletedAt;
  final DateTime? outForDeliveryAt;
  final DateTime? outForRedeliveryAt;
  final DateTime? deliveredAt;
  final DateTime? deliveryFailedAt;
  final DateTime? expectedDeliveryAt;

  bool get hasPartner => (partnerId ?? '').isNotEmpty;

  /// "Processing" and "ironing" both just mean the clothes are at the hub, and
  /// saying so is more use to a customer than the internal word.
  String get statusLabel {
    if (status == 'processing' || status == 'ironing') return 'At hub';
    if (status.isEmpty) return 'Unknown';
    final spaced = status.replaceAll('_', ' ');
    return spaced[0].toUpperCase() + spaced.substring(1);
  }

  String get itemsText => items.isEmpty
      ? 'No items'
      : items.map((i) => '${i.quantity} ${i.name}').join(', ');

  OrderBreakdown get breakdown {
    final itemsSum = items.fold<num>(0, (s, i) => s + i.lineTotal);
    final express = expressDelivery ? expressDeliveryFee : 0;
    final saved = raw['itemsSubtotal'] is num;

    final subtotal = saved ? _num(raw['itemsSubtotal']) : itemsSum;
    final discount = saved
        ? _num(raw['discountAmount'])
        : (subtotal + previousDuePaid + express - totalAmount)
            .clamp(0, double.infinity);

    return OrderBreakdown(
      subtotal: subtotal,
      express: express,
      due: previousDuePaid,
      discount: discount,
      total: totalAmount,
      wallet: saved ? _num(raw['walletUsed']) : 0,
      paidOnline: saved ? _num(raw['amountPaidOnline']) : null,
    );
  }

  factory CustomerOrder.fromJson(Map<String, dynamic> json) {
    // partnerId arrives either as an id or as a populated object.
    String? partner;
    final rawPartner = json['partnerId'] ?? json['assignedPartner'];
    if (rawPartner is Map) {
      partner = (rawPartner['_id'] ?? '').toString();
    } else if (rawPartner != null) {
      partner = rawPartner.toString();
    }
    if (partner != null && partner.isEmpty) partner = null;

    final slot = json['pickupSlot'];

    return CustomerOrder(
      id: (json['_id'] ?? '').toString(),
      orderId: (json['orderId'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      items: (json['items'] is List)
          ? (json['items'] as List)
              .whereType<Map>()
              .map((m) => OrderItem.fromJson(Map<String, dynamic>.from(m)))
              .toList()
          : <OrderItem>[],
      totalAmount: _num(json['totalAmount']),
      createdAt: _date(json['createdAt']),
      raw: json,
      partnerId: partner,
      pickupAddress: json['pickupAddress'] is Map
          ? CustomerAddress.fromJson(
              Map<String, dynamic>.from(json['pickupAddress'] as Map))
          : null,
      pickupSlotLabel:
          slot is Map ? slot['timeSlot']?.toString() : slot?.toString(),
      pickupSlotDate: slot is Map ? _date(slot['date']) : null,
      paymentMethod: json['paymentMethod']?.toString(),
      paymentStatus: json['paymentStatus']?.toString(),
      expressDelivery: json['expressDelivery'] == true,
      expressDeliveryFee: _num(json['expressDeliveryFee']),
      previousDuePaid: _num(json['previousDuePaid']),
      cancellationFee: _num(json['cancellationFee']),
      cancellationReason: json['cancellationReason']?.toString(),
      deliveryFailureFee: _num(json['deliveryFailureFee']),
      deliveryFailureReason: json['deliveryFailureReason']?.toString(),
      suspensionReason: json['suspensionReason']?.toString(),
      redeliveryScheduled: json['redeliveryScheduled'] == true,
      appliedVoucherCode: json['appliedVoucherCode']?.toString(),
      specialInstructions: json['specialInstructions']?.toString(),
      issue: json['issue']?.toString(),
      reachedLocationAt: _date(json['reachedLocationAt']),
      pickedUpAt: _date(json['pickedUpAt']),
      deliveredToHubAt: _date(json['deliveredToHubAt']),
      processCompletedAt: _date(json['processCompletedAt']),
      outForDeliveryAt: _date(json['outForDeliveryAt']),
      outForRedeliveryAt: _date(json['outForRedeliveryAt']),
      deliveredAt: _date(json['deliveredAt']),
      deliveryFailedAt: _date(json['deliveryFailedAt']),
      expectedDeliveryAt: _date(json['expectedDeliveryAt']),
    );
  }
}
