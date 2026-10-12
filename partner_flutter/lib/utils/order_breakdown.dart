import '../models/order.dart';

/// `src/utils/orderBreakdown.ts`.
///
/// What the captain needs to know before handing an order over: what it was
/// made of, and how much of it is still to collect.
///
/// Older orders predate the saved breakdown fields, so where `itemsSubtotal`
/// is absent the discount is inferred from what the parts add up to against
/// the total that was actually charged.
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

  /// null on an order that predates the saved breakdown, which is different
  /// from a known zero.
  final num? paidOnline;

  factory OrderBreakdown.of(PartnerOrder order) {
    final raw = order.raw;
    num asNum(Object? value) =>
        value is num ? value : num.tryParse('${value ?? ''}') ?? 0;

    final itemsSum = order.items
        .fold<num>(0, (sum, item) => sum + item.quantity * item.price);
    final total = asNum(raw['totalAmount']);
    final express =
        order.expressDelivery ? asNum(raw['expressDeliveryFee']) : 0;
    final due = asNum(raw['previousDuePaid']);
    final saved = raw['itemsSubtotal'] is num;

    final subtotal = saved ? raw['itemsSubtotal'] as num : itemsSum;
    final discount = saved
        ? asNum(raw['discountAmount'])
        : (subtotal + due + express - total) < 0
            ? 0
            : subtotal + due + express - total;

    return OrderBreakdown(
      subtotal: subtotal,
      express: express,
      due: due,
      discount: discount,
      total: total,
      wallet: saved ? asNum(raw['walletUsed']) : 0,
      paidOnline: saved ? asNum(raw['amountPaidOnline']) : null,
    );
  }
}
