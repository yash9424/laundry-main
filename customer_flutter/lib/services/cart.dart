import 'package:flutter/foundation.dart';

import 'store.dart';

/// One line in the cart. The shape is exactly what the web app kept under the
/// `cartItems` key, and exactly what POST /api/orders expects in `items`.
class CartLine {
  CartLine({
    required this.id,
    required this.name,
    required this.price,
    required this.quantity,
    required this.category,
  });

  final String id;
  final String name;
  final num price;
  int quantity;
  final String category;

  num get lineTotal => price * quantity;

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'price': price,
        'quantity': quantity,
        'category': category,
      };

  /// What the order route reads: name, quantity, price. Nothing else is kept.
  Map<String, dynamic> toOrderItem() => {
        'name': name,
        'quantity': quantity,
        'price': price,
      };

  factory CartLine.fromJson(Map<String, dynamic> json) => CartLine(
        id: (json['id'] ?? '').toString(),
        name: (json['name'] ?? '').toString(),
        price: num.tryParse(json['price']?.toString() ?? '') ?? 0,
        quantity: int.tryParse(json['quantity']?.toString() ?? '') ?? 0,
        category: (json['category'] ?? 'Laundry').toString(),
      );
}

/// The cart, held in storage so it survives the app being closed -- the same
/// promise the web app made by writing to localStorage on every tap.
///
/// `revision` ticks on every change so any screen showing a count or a total
/// can listen instead of re-reading storage on every build.
class Cart {
  Cart._();

  static final ValueNotifier<int> revision = ValueNotifier<int>(0);

  static List<CartLine> _lines = [];
  static bool _loaded = false;

  static List<CartLine> get lines {
    _ensureLoaded();
    return List.unmodifiable(_lines);
  }

  static void _ensureLoaded() {
    if (_loaded) return;
    final raw = Store.getJson(Store.kCartItems);
    _lines = (raw is List)
        ? raw
            .whereType<Map>()
            .map((m) => CartLine.fromJson(Map<String, dynamic>.from(m)))
            .where((l) => l.id.isNotEmpty && l.quantity > 0)
            .toList()
        : [];
    _loaded = true;
  }

  /// Re-reads from storage; used when something outside the cart changed it.
  static void reload() {
    _loaded = false;
    _ensureLoaded();
    revision.value++;
  }

  static int get itemCount {
    _ensureLoaded();
    return _lines.fold(0, (sum, l) => sum + l.quantity);
  }

  static num get total {
    _ensureLoaded();
    return _lines.fold<num>(0, (sum, l) => sum + l.lineTotal);
  }

  static bool get isEmpty => itemCount == 0;

  static int quantityOf(String itemId) {
    _ensureLoaded();
    for (final line in _lines) {
      if (line.id == itemId) return line.quantity;
    }
    return 0;
  }

  static Future<void> _persist() async {
    await Store.setJson(Store.kCartItems, _lines.map((l) => l.toJson()).toList());
    revision.value++;
  }

  /// Sets an exact quantity; zero removes the line.
  static Future<void> setQuantity({
    required String id,
    required String name,
    required num price,
    required String category,
    required int quantity,
  }) async {
    _ensureLoaded();
    final next = quantity < 0 ? 0 : quantity;
    final index = _lines.indexWhere((l) => l.id == id);
    if (next == 0) {
      if (index >= 0) _lines.removeAt(index);
    } else if (index >= 0) {
      _lines[index].quantity = next;
    } else {
      _lines.add(CartLine(
        id: id,
        name: name,
        price: price,
        quantity: next,
        category: category,
      ));
    }
    await _persist();
  }

  static Future<void> bump({
    required String id,
    required String name,
    required num price,
    required String category,
    required bool up,
  }) =>
      setQuantity(
        id: id,
        name: name,
        price: price,
        category: category,
        quantity: quantityOf(id) + (up ? 1 : -1),
      );

  static Future<void> clear() async {
    _lines = [];
    _loaded = true;
    await Store.remove(Store.kCartItems);
    revision.value++;
  }
}
