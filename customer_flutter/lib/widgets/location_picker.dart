import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

import '../theme/brand.dart';
import 'common.dart';

class PickedLocation {
  const PickedLocation(this.latitude, this.longitude);

  final double latitude;
  final double longitude;
}

/// Bengaluru, so the map opens somewhere sensible while the real spot is
/// worked out.
const _fallback = LatLng(12.9716, 77.5946);

/// "Pin your exact location": the point the captain will navigate to.
///
/// The tiles are OpenStreetMap rather than Google. The web version needed the
/// Maps JavaScript API, which needs billing enabled on the Google Cloud project
/// -- until that is switched on it shows an error and no map at all. This works
/// today and produces the same latitude/longitude, which is the part that
/// actually reaches the captain.
class LocationPicker extends StatefulWidget {
  const LocationPicker({
    super.key,
    required this.value,
    required this.onChanged,
  });

  final PickedLocation? value;
  final ValueChanged<PickedLocation> onChanged;

  @override
  State<LocationPicker> createState() => _LocationPickerState();
}

class _LocationPickerState extends State<LocationPicker> {
  final _map = MapController();
  LatLng? _pin;
  bool _locating = false;
  String _error = '';

  @override
  void initState() {
    super.initState();
    final value = widget.value;
    if (value != null) _pin = LatLng(value.latitude, value.longitude);
  }

  void _publish(LatLng point) {
    setState(() => _pin = point);
    widget.onChanged(PickedLocation(
      double.parse(point.latitude.toStringAsFixed(6)),
      double.parse(point.longitude.toStringAsFixed(6)),
    ));
  }

  Future<void> _useMyLocation() async {
    setState(() {
      _locating = true;
      _error = '';
    });
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        setState(() {
          _locating = false;
          _error = 'Location is switched off on this device. '
              'Turn it on, or tap the map instead.';
        });
        return;
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        setState(() {
          _locating = false;
          _error = 'Location permission was denied. '
              'Turn it on, or tap the map to set the pin instead.';
        });
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 15),
        ),
      );
      if (!mounted) return;
      final point = LatLng(position.latitude, position.longitude);
      _map.move(point, 17);
      _publish(point);
      setState(() => _locating = false);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _locating = false;
        _error = 'Could not get your location. Tap the map to set the pin.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final pin = _pin;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(color: Color(0x14000000), blurRadius: 12, offset: Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Row(
            children: [
              Icon(Icons.location_on, size: 17, color: Brand.purple),
              SizedBox(width: 8),
              Text(
                'Pin your exact location',
                style: TextStyle(
                  fontFamily: 'Montserrat',
                  fontSize: 15.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            'Tap or drag the pin to your door. This is the point your captain '
            'will navigate to.',
            style: TextStyle(fontSize: 12, color: Brand.gray600, height: 1.5),
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: SizedBox(
              height: 220,
              child: FlutterMap(
                mapController: _map,
                options: MapOptions(
                  initialCenter: pin ?? _fallback,
                  initialZoom: pin == null ? 12 : 17,
                  onTap: (_, point) => _publish(point),
                ),
                children: [
                  TileLayer(
                    urlTemplate:
                        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: 'com.urbansteam.customerapp',
                  ),
                  if (pin != null)
                    MarkerLayer(
                      markers: [
                        Marker(
                          point: pin,
                          width: 40,
                          height: 40,
                          alignment: Alignment.topCenter,
                          child: const Icon(
                            Icons.location_on,
                            size: 40,
                            color: Brand.purple,
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          GradientButton(
            label: _locating ? 'Finding you...' : 'Use my current location',
            icon: _locating ? null : Icons.my_location,
            busy: _locating,
            height: 44,
            radius: 16,
            fontSize: 14,
            onPressed: _locating ? null : _useMyLocation,
          ),
          const SizedBox(height: 8),
          if (_error.isNotEmpty)
            Text(
              _error,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  fontSize: 11.5, color: Brand.destructive, height: 1.4),
            )
          else if (pin != null)
            Text(
              'Pinned at ${pin.latitude.toStringAsFixed(5)}, '
              '${pin.longitude.toStringAsFixed(5)}',
              textAlign: TextAlign.center,
              style: const TextStyle(
                  fontSize: 11.5, color: Color(0xFF15803D)),
            )
          else
            const Text(
              'No pin set yet — your captain will only have the typed address.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 11.5, color: Brand.mutedForeground),
            ),
        ],
      ),
    );
  }
}
