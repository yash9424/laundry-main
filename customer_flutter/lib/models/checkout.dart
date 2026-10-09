import '../services/cart.dart';

/// What checkout carries from one step to the next: cart -> checklist -> slot
/// -> offers and payment. The web app passed this as router state; here it is a
/// typed object so a missing field cannot slip through unnoticed.
class CheckoutDraft {
  CheckoutDraft({
    required this.items,
    required this.itemsTotal,
    this.pickupType,
    this.pickupDate,
    this.pickupDayLabel,
    this.selectedSlot,
  });

  final List<CartLine> items;
  final num itemsTotal;

  /// 'now' for a same-day pickup, 'later' for any other date.
  final String? pickupType;
  final DateTime? pickupDate;
  final String? pickupDayLabel;
  final String? selectedSlot;

  int get pieces => items.fold(0, (n, item) => n + item.quantity);

  bool get isEmpty => items.isEmpty;

  CheckoutDraft withSlot({
    required String pickupType,
    required DateTime pickupDate,
    required String pickupDayLabel,
    required String selectedSlot,
  }) =>
      CheckoutDraft(
        items: items,
        itemsTotal: itemsTotal,
        pickupType: pickupType,
        pickupDate: pickupDate,
        pickupDayLabel: pickupDayLabel,
        selectedSlot: selectedSlot,
      );

  /// Reads the draft back out of a route's arguments, or null when the screen
  /// was reached directly with nothing to work on.
  static CheckoutDraft? fromArguments(Object? args) {
    if (args is CheckoutDraft) return args;
    if (args is Map) {
      final items = args['cartItems'];
      if (items is List<CartLine> && items.isNotEmpty) {
        return CheckoutDraft(
          items: items,
          itemsTotal: num.tryParse(args['totalAmount']?.toString() ?? '') ?? 0,
        );
      }
    }
    return null;
  }
}
