import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../models/order.dart';
import '../theme/brand.dart';
import '../utils/map_links.dart';

/// The page holding the iframe needs a real origin for the embed to accept it,
/// the way the Capacitor build served the app from one.
const _baseUrl = 'https://acsgroup.cloud/';

/// `components/LeafletMap.tsx` -- which, despite the name, has no Leaflet in
/// it: it is a Google Maps embed inside an `<iframe>`.
///
/// The iframe matters. Google's embed endpoint refuses to draw anything when
/// it is the top-level document and answers "The Google Maps Embed API must be
/// used in an iframe", so the webview loads a one-line page that holds the
/// iframe rather than the embed URL directly.
class AddressMap extends StatefulWidget {
  const AddressMap({
    super.key,
    required this.address,
    this.raw,
    this.height = 160,
    this.borderRadius = Brand.r2xl,
  });

  final OrderAddress address;

  /// The address map as the server sent it, which may carry the customer's
  /// pinned latitude and longitude.
  final Map<String, dynamic>? raw;
  final double height;
  final double borderRadius;

  @override
  State<AddressMap> createState() => _AddressMapState();
}

class _AddressMapState extends State<AddressMap> {
  WebViewController? _controller;
  bool _failed = false;

  String get _embedUrl => MapLinks.embedUrl(widget.address, raw: widget.raw);

  String get _embedPage => '<!doctype html><html><head><meta name="viewport" '
      'content="width=device-width,initial-scale=1"></head>'
      '<body style="margin:0;background:#f3f4f6">'
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
        ..setBackgroundColor(Brand.gray100)
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

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(widget.borderRadius),
      child: SizedBox(
        height: widget.height,
        width: double.infinity,
        // Nothing on top of the map: the web app's tile is the bare iframe,
        // and the screens that need a way out to Google Maps already have
        // their own link under it.
        child: _failed || _controller == null
            ? const _MapFallback()
            : WebViewWidget(controller: _controller!),
      ),
    );
  }
}

class _MapFallback extends StatelessWidget {
  const _MapFallback();

  @override
  Widget build(BuildContext context) {
    return const ColoredBox(
      color: Brand.gray100,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('\u{1F4CD}', style: TextStyle(fontSize: 32)),
            SizedBox(height: 8),
            Text('Map unavailable',
                style: TextStyle(
                    fontSize: 14, height: Brand.leadSm, color: Brand.gray500)),
          ],
        ),
      ),
    );
  }
}

/// What the pickups banner shows when there is nothing to put on a map.
class NoLocationsMap extends StatelessWidget {
  const NoLocationsMap({super.key, this.message = 'No pickup locations'});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Brand.gray100,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('\u{1F4CD}', style: TextStyle(fontSize: 36)),
            const SizedBox(height: 8),
            Text(message,
                style: const TextStyle(
                    fontSize: 14, height: Brand.leadSm, color: Brand.gray500)),
          ],
        ),
      ),
    );
  }
}
