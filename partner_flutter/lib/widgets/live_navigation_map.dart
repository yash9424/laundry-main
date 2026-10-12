import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

import '../models/order.dart';
import '../theme/brand.dart';
import '../utils/map_links.dart';

/// The Google Maps browser key the Capacitor build reads from
/// `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
///
/// It is deliberately not written into this file. The same key is already in
/// git twice (CLAUDE.md 8.6) and adding a third copy spreads it further for
/// nothing, so it is passed at build time:
///
///     flutter build apk --release --dart-define=GOOGLE_MAPS_API_KEY=...
///
/// Without it the widget falls back to the same panel the web app shows for a
/// customer who never pinned their door: the address and a link out to Google
/// Maps. Nothing else on the screen depends on it.
const _mapsKey = String.fromEnvironment('GOOGLE_MAPS_API_KEY');

/// `components/LiveNavigationMap.tsx`.
///
/// The customer's pin, the captain's own position as it moves, and the route
/// along the roads between them with the distance, the time and the next turn.
///
/// The routing is Google's Directions service, driven by the Maps JavaScript
/// SDK. Rather than rebuild that in Dart against a different API, this hosts
/// the same script in a webview and feeds it the destination, so the captain
/// gets the same route from the same source as the shipped app. The webview is
/// granted location permission so `navigator.geolocation.watchPosition` works
/// inside it exactly as it does today.
class LiveNavigationMap extends StatefulWidget {
  const LiveNavigationMap({
    super.key,
    required this.destination,
    this.raw,
    this.label = 'Customer location',
    this.customerName,
  });

  final OrderAddress destination;

  /// The address as the server sent it, which carries the pin when there is one.
  final Map<String, dynamic>? raw;
  final String label;
  final String? customerName;

  @override
  State<LiveNavigationMap> createState() => _LiveNavigationMapState();
}

class _LiveNavigationMapState extends State<LiveNavigationMap> {
  WebViewController? _controller;

  bool get _pinned => MapLinks.hasCoordinates(widget.raw);
  bool get _usable => _pinned && _mapsKey.isNotEmpty;

  @override
  void initState() {
    super.initState();
    if (_usable) _open();
  }

  void _open() {
    final controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Brand.gray100)
      ..loadHtmlString(_page, baseUrl: 'https://acsgroup.cloud/');

    // Android asks the host app before letting a page read the device's
    // location; without this the watchPosition call inside the page is denied
    // and the captain's own marker never appears.
    final platform = controller.platform;
    if (platform is AndroidWebViewController) {
      platform.setGeolocationPermissionsPromptCallbacks(
        onShowPrompt: (request) async => const GeolocationPermissionsResponse(
          allow: true,
          retain: true,
        ),
      );
    }

    setState(() => _controller = controller);
  }

  Future<void> _navigate() async {
    final uri =
        Uri.parse(MapLinks.directionsUrl(widget.destination, raw: widget.raw));
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      // Nothing to open it with; the panel stays as it is.
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_usable) return _unavailable();

    return Container(
      decoration: BoxDecoration(
        color: Brand.surface,
        border: Border.all(color: Brand.gray200),
        borderRadius: BorderRadius.circular(Brand.rXl),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Text(
              widget.label,
              style: const TextStyle(
                fontSize: 14,
                height: Brand.leadSm,
                fontWeight: FontWeight.w600,
                color: Colors.black,
              ),
            ),
          ),
          const Divider(height: 1, color: Brand.gray100),
          SizedBox(
            height: 224, // h-56
            child: _controller == null
                ? const ColoredBox(
                    color: Brand.gray100,
                    child: Center(
                      child: Text('Loading map...',
                          style: TextStyle(
                              fontSize: 14,
                              height: Brand.leadSm,
                              color: Brand.gray500)),
                    ),
                  )
                : WebViewWidget(controller: _controller!),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 42,
                    child: OutlinedButton(
                      onPressed: _navigate,
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Brand.purple, width: 2),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(Brand.rXl),
                        ),
                      ),
                      child: const Text(
                        'Navigate',
                        style: TextStyle(
                          fontFamily: Brand.heading,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Brand.purple,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// What the web app shows when the customer never pinned their door -- and
  /// what this shows when the Maps key was not supplied at build time.
  Widget _unavailable() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBEB), // amber-50
        border: Border.all(color: const Color(0xFFFDE68A)), // amber-200
        borderRadius: BorderRadius.circular(Brand.rXl),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.label,
            style: const TextStyle(
              fontSize: 14,
              height: Brand.leadSm,
              fontWeight: FontWeight.w600,
              color: Color(0xFF92400E),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            _pinned
                ? 'Live navigation is not configured in this build. Use the '
                    'address and open it in Google Maps.'
                : 'This customer has not pinned their location, so live '
                    'navigation is not available. Use the address and open it '
                    'in Google Maps.',
            style: const TextStyle(
                fontSize: 12, height: Brand.leadXs, color: Color(0xFFB45309)),
          ),
          const SizedBox(height: 8),
          GestureDetector(
            onTap: _navigate,
            child: const Text(
              'Open in Google Maps',
              style: TextStyle(
                fontSize: 12,
                height: Brand.leadXs,
                fontWeight: FontWeight.w600,
                color: Brand.purple,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// The page the webview runs: the same Maps SDK, the same Directions call,
  /// and the same re-route thresholds the React component uses (a new route is
  /// only worth fetching once the captain has moved 120 m, and at most every
  /// 20 seconds, so a GPS tick does not burn quota).
  String get _page {
    final lat = widget.raw?['latitude'];
    final lng = widget.raw?['longitude'];
    final name = jsonEncode(widget.customerName ?? 'Customer');

    return '''
<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  html,body{margin:0;height:100%;font-family:sans-serif;background:#f3f4f6}
  #map{position:absolute;inset:0}
  #hud{position:absolute;left:8px;right:8px;top:8px;z-index:2;background:#fff;
       border-radius:10px;padding:6px 10px;box-shadow:0 2px 8px rgba(0,0,0,.15);
       font-size:12px;color:#111827}
  #step{color:#452D9B;font-weight:600;margin-top:2px}
  #live{float:right;color:#07C8D0;font-weight:600;font-size:11px}
</style>
</head>
<body>
<div id="hud"><span id="live"></span><span id="headline">Locating…</span><div id="step"></div></div>
<div id="map"></div>
<script>
  var DEST = { lat: $lat, lng: $lng };
  var NAME = $name;
  var REROUTE_AFTER_METRES = 120, REROUTE_AFTER_MS = 20000;
  var map, me, renderer, service, lastFrom = null, lastAt = 0;

  function metres(a, b) {
    var R = 6371000, toRad = function (d) { return d * Math.PI / 180; };
    var dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
    var s = Math.pow(Math.sin(dLat / 2), 2) +
            Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.pow(Math.sin(dLng / 2), 2);
    return 2 * R * Math.asin(Math.sqrt(s));
  }
  function readable(m) { return m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(1) + ' km'; }
  function plain(html) { return html.replace(/<[^>]*>/g, ' ').replace(/\\s+/g, ' ').trim(); }

  function init() {
    map = new google.maps.Map(document.getElementById('map'), {
      center: DEST, zoom: 16, disableDefaultUI: true, zoomControl: true
    });
    new google.maps.Marker({ position: DEST, map: map, title: NAME });
    renderer = new google.maps.DirectionsRenderer({ map: map, suppressMarkers: true });
    service = new google.maps.DirectionsService();
    watch();
  }

  function watch() {
    if (!navigator.geolocation) { document.getElementById('headline').textContent = 'Location unavailable'; return; }
    navigator.geolocation.watchPosition(function (pos) {
      var here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      document.getElementById('live').textContent = '● LIVE';
      if (!me) {
        me = new google.maps.Marker({
          position: here, map: map, title: 'You',
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 7,
                  fillColor: '#452D9B', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 }
        });
      } else { me.setPosition(here); }

      document.getElementById('headline').textContent = readable(metres(here, DEST)) + ' away';

      var now = Date.now();
      var moved = !lastFrom || metres(lastFrom, here) > REROUTE_AFTER_METRES;
      if (moved && now - lastAt > REROUTE_AFTER_MS) {
        lastFrom = here; lastAt = now;
        service.route({ origin: here, destination: DEST, travelMode: 'DRIVING' },
          function (result, status) {
            if (status !== 'OK' || !result.routes[0]) return;
            renderer.setDirections(result);
            var leg = result.routes[0].legs[0];
            document.getElementById('headline').textContent =
              leg.distance.text + ' · ' + leg.duration.text + ' by road';
            if (leg.steps && leg.steps[0]) {
              document.getElementById('step').textContent = 'Next: ' + plain(leg.steps[0].instructions);
            }
          });
      }
    }, function () {
      document.getElementById('headline').textContent = 'Could not read your location';
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
  }
</script>
<script async src="https://maps.googleapis.com/maps/api/js?key=$_mapsKey&libraries=geometry&callback=init"></script>
</body>
</html>
''';
  }
}
