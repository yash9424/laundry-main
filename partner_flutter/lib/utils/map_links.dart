import '../models/order.dart';

/// `src/utils/mapLinks.ts`.
///
/// Searching by address text is what produced the "partial match" pins: Google
/// guesses, and on a long road it often guesses the wrong end. When the
/// customer has dropped a pin we navigate to those coordinates instead.
class MapLinks {
  MapLinks._();

  static bool hasCoordinates(Map<String, dynamic>? address) {
    final lat = address?['latitude'];
    final lng = address?['longitude'];
    return lat is num && lng is num && lat.isFinite && lng.isFinite;
  }

  static String _addressText(OrderAddress address) => [
        address.street,
        address.city,
        address.state,
        address.pincode
      ].map((p) => p.trim()).where((p) => p.isNotEmpty).join(', ');

  /// Turn-by-turn directions -- the pin when we have one.
  static String directionsUrl(
    OrderAddress address, {
    Map<String, dynamic>? raw,
  }) {
    if (hasCoordinates(raw)) {
      return 'https://www.google.com/maps/dir/?api=1'
          '&destination=${raw!['latitude']},${raw['longitude']}';
    }
    return 'https://www.google.com/maps/search/?api=1'
        '&query=${Uri.encodeComponent(_addressText(address))}';
  }

  /// An embeddable map centred on the address, for the preview panes.
  static String embedUrl(OrderAddress address, {Map<String, dynamic>? raw}) {
    final pinned = hasCoordinates(raw);
    final query = pinned
        ? '${raw!['latitude']},${raw['longitude']}'
        : '${_addressText(address)}, India';
    final zoom = pinned ? 18 : 14;
    return 'https://maps.google.com/maps'
        '?q=${Uri.encodeComponent(query)}&z=$zoom&output=embed';
  }

  /// Shown next to the map so the captain knows how precise the location is.
  static String accuracyLabel(Map<String, dynamic>? raw) => hasCoordinates(raw)
      ? 'Exact location pinned by the customer'
      : 'Approximate — matched from the address';
}
