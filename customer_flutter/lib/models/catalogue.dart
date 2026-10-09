import '../config/api.dart';

/// Turns a stored path into something an Image.network can load. Uploads come
/// back as `/uploads/...` relative to the API host; anything already absolute
/// is left alone.
String? absoluteUrl(Object? raw) {
  final value = raw?.toString().trim();
  if (value == null || value.isEmpty) return null;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('data:')) return value;
  return '$apiUrl${value.startsWith('/') ? '' : '/'}$value';
}

num _num(Object? v) {
  if (v is num) return v;
  return num.tryParse(v?.toString() ?? '') ?? 0;
}

/// A garment in the catalogue (PricingItem on the server). Items name their
/// category as a string, not an id -- that is how the collection is shaped.
class PricingItem {
  PricingItem({
    required this.id,
    required this.name,
    required this.price,
    required this.category,
    this.description,
    this.image,
  });

  final String id;
  final String name;
  final num price;
  final String category;
  final String? description;
  final String? image;

  factory PricingItem.fromJson(Map<String, dynamic> json) => PricingItem(
        id: (json['_id'] ?? '').toString(),
        name: (json['name'] ?? '').toString(),
        price: _num(json['price']),
        category: (json['category'] ?? 'Laundry').toString(),
        description: json['description']?.toString(),
        image: absoluteUrl(json['image']),
      );
}

class PricingCategory {
  PricingCategory({required this.id, required this.name, this.image});

  final String id;
  final String name;
  final String? image;

  factory PricingCategory.fromJson(Map<String, dynamic> json) => PricingCategory(
        id: (json['_id'] ?? json['name'] ?? '').toString(),
        name: (json['name'] ?? '').toString(),
        image: absoluteUrl(json['image']),
      );
}

/// A wallet top-up plan (SubscriptionPlan): pay X, get Y in the wallet.
class TopupPlan {
  TopupPlan({
    required this.id,
    required this.name,
    required this.price,
    required this.walletCredit,
    required this.benefits,
    this.image,
    this.isActive = true,
  });

  final String id;
  final String name;
  final num price;
  final num walletCredit;
  final List<String> benefits;
  final String? image;
  final bool isActive;

  /// How much more than the money paid lands in the wallet, as a percentage.
  int get bonusPercent => walletCredit > price && price > 0
      ? (((walletCredit - price) / price) * 100).round()
      : 0;

  factory TopupPlan.fromJson(Map<String, dynamic> json) => TopupPlan(
        id: (json['_id'] ?? '').toString(),
        name: (json['name'] ?? '').toString(),
        price: _num(json['price']),
        walletCredit: _num(json['walletCredit']),
        benefits: (json['benefits'] is List)
            ? (json['benefits'] as List)
                .map((b) => b.toString().trim())
                .where((b) => b.isNotEmpty)
                .toList()
            : <String>[],
        image: absoluteUrl(json['image']),
        isActive: json['isActive'] != false,
      );
}

/// A banner on the home screen (HeroSection).
class HeroItem {
  HeroItem({
    required this.id,
    required this.url,
    required this.type,
    this.title,
    this.description,
    this.buttonText,
    this.buttonLink,
  });

  final String id;
  final String url;
  final String type;
  final String? title;
  final String? description;
  final String? buttonText;
  final String? buttonLink;

  bool get isVideo => type == 'video';

  factory HeroItem.fromJson(Map<String, dynamic> json) => HeroItem(
        id: (json['_id'] ?? '').toString(),
        url: absoluteUrl(json['url']) ?? '',
        type: (json['type'] ?? 'image').toString(),
        title: json['title']?.toString(),
        description: json['description']?.toString(),
        buttonText: json['buttonText']?.toString(),
        buttonLink: json['buttonLink']?.toString(),
      );
}

/// A percentage-off code (Voucher).
class Voucher {
  Voucher({required this.code, required this.discount, this.slogan});

  final String code;
  final num discount;
  final String? slogan;

  factory Voucher.fromJson(Map<String, dynamic> json) => Voucher(
        code: (json['code'] ?? '').toString(),
        discount: _num(json['discount']),
        slogan: json['slogan']?.toString(),
      );
}
