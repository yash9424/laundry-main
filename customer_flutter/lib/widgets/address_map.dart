import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../models/customer.dart';
import '../theme/brand.dart';

/// The little map on the checkout and order screens.
///
/// The web app called this component LeafletMap, but there is no Leaflet in it:
/// it is a Google Maps embed in an iframe. This keeps the same embed URL inside
/// a webview, so what the customer sees does not change. When the customer
/// dropped a pin we use those coordinates, which is more exact than a text
/// search of the address.
class AddressMap extends StatefulWidget {
  const AddressMap({super.key, required this.address, this.height = 150});

  final CustomerAddress address;
  final double height;

  @override
  State<AddressMap> createState() => _AddressMapState();
}

/// The page holding the iframe needs a real origin for the embed to accept it,
/// the way the Capacitor build served the app from one.
const _baseUrl = 'https://acsgroup.cloud/';

class _AddressMapState extends State<AddressMap> {
  WebViewController? _controller;
  bool _failed = false;

  String get _embedUrl {
    final a = widget.address;
    final query = a.hasPin
        ? '${a.latitude},${a.longitude}'
        : a.searchQuery;
    return 'https://maps.google.com/maps'
        '?q=${Uri.encodeComponent(query)}&t=&z=13&ie=UTF8&iwloc=&output=embed';
  }

  /// Google's embed endpoint refuses to draw anything when it is the top-level
  /// document -- it answers "The Google Maps Embed API must be used in an
  /// iframe". The web app never hits that because LeafletMap.tsx puts the same
  /// URL in an <iframe>, so the webview loads that same one-line page instead
  /// of the embed URL directly.
  String get _embedPage =>
      '<!doctype html><html><head><meta name="viewport" '
      'content="width=device-width,initial-scale=1"></head>'
      '<body style="margin:0;background:#eff6ff">'
      '<iframe src="$_embedUrl" width="100%" height="100%" '
      'style="border:0;position:absolute;inset:0" allowfullscreen '
      'loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>'
      '</body></html>';

  @override
  void initState() {
    super.initState();
    _open();
  }

  @override
  void didUpdateWidget(covariant AddressMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.address.oneLine != widget.address.oneLine) {
      _controller?.loadHtmlString(_embedPage, baseUrl: _baseUrl);
    }
  }

  void _open() {
    try {
      final controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setBackgroundColor(const Color(0xFFEFF6FF))
        ..setNavigationDelegate(NavigationDelegate(
          onWebResourceError: (_) {
            if (mounted) setState(() => _failed = true);
          },
        ))
        ..loadHtmlString(_embedPage, baseUrl: _baseUrl);
      setState(() => _controller = controller);
    } catch (_) {
      setState(() => _failed = true);
    }
  }

  /// Opens the real Maps app, which is what someone tapping a map expects.
  Future<void> _openInMaps() async {
    final a = widget.address;
    final query = a.hasPin ? '${a.latitude},${a.longitude}' : a.searchQuery;
    final uri = Uri.parse(
        'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(query)}');
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      // Nothing to open the link with; leaving the map in place is fine.
    }
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: SizedBox(
        height: widget.height,
        width: double.infinity,
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (_failed || _controller == null)
              const _MapFallback()
            else
              WebViewWidget(controller: _controller!),
            // The embed swallows taps, so the "open in Maps" affordance sits on
            // top of it as its own button rather than over the whole map.
            Positioned(
              right: 8,
              bottom: 8,
              child: Material(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
                elevation: 2,
                child: InkWell(
                  borderRadius: BorderRadius.circular(10),
                  onTap: _openInMaps,
                  child: const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                    child: Row(
                      children: [
                        Icon(Icons.open_in_new, size: 14, color: Brand.purple),
                        SizedBox(width: 5),
                        Text(
                          'Open in Maps',
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w600,
                            color: Brand.purple,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MapFallback extends StatelessWidget {
  const _MapFallback();

  @override
  Widget build(BuildContext context) {
    return const ColoredBox(
      color: Color(0xFFEFF6FF),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.location_on_outlined, size: 30, color: Brand.purple),
            SizedBox(height: 4),
            Text(
              'Map unavailable',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Brand.purple,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Shown where there is no address to put on a map yet.
class NoAddressMap extends StatelessWidget {
  const NoAddressMap({super.key, this.height = 150});

  final double height;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.location_on_outlined, size: 32, color: Brand.purple),
            SizedBox(height: 6),
            Text(
              'No address',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Brand.purple,
              ),
            ),
            Text(
              'Add address to see map',
              style: TextStyle(fontSize: 12, color: Brand.purple),
            ),
          ],
        ),
      ),
    );
  }
}
