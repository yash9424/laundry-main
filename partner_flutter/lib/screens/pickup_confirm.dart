import 'package:flutter/material.dart';

import '../models/order.dart';
import '../services/api.dart';
import '../theme/brand.dart';
import '../widgets/common.dart';
import '../widgets/photo_picker.dart';

/// `app/pickups/confirm/page.tsx`.
///
/// The step at the customer's door: photograph the clothes, upload them, tick
/// the confirmation, and the order becomes `picked_up`. Two photos is the
/// floor, and the screen holds the captain to it in both places -- the upload
/// button and the confirm button.
class PickupConfirmScreen extends StatefulWidget {
  const PickupConfirmScreen({super.key, required this.orderId});

  final String orderId;

  @override
  State<PickupConfirmScreen> createState() => _PickupConfirmScreenState();
}

class _PickupConfirmScreenState extends State<PickupConfirmScreen> {
  final _notes = TextEditingController();
  final List<String> _photos = [];

  PartnerOrder? _order;
  bool _loading = true;
  bool _uploading = false;
  bool _confirming = false;
  bool _confirmed = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final result = await Api.order(widget.orderId);
    if (!mounted) return;
    setState(() {
      if (result.ok) _order = PartnerOrder(result.map);
      _loading = false;
    });
  }

  Future<void> _addPhoto() async {
    final picked = await pickImageAsDataUrl(context);
    if (picked == null || !mounted) return;
    setState(() => _photos.add(picked));
  }

  Future<void> _upload() async {
    final order = _order;
    if (order == null) return;
    if (_photos.length < 2) {
      showToast(context, 'Please upload at least 2 photos',
          kind: ToastKind.warning);
      return;
    }

    setState(() => _uploading = true);
    final result = await Api.patchOrder(order.id, {'pickupPhotos': _photos});
    if (!mounted) return;
    setState(() => _uploading = false);

    showToast(
      context,
      result.ok ? 'Images uploaded successfully!' : 'Failed to upload images',
      kind: result.ok ? ToastKind.success : ToastKind.error,
    );
  }

  Future<void> _confirm() async {
    final order = _order;
    if (order == null) return;
    if (_photos.length < 2) {
      showToast(context, 'Please upload at least 2 photos before confirming',
          kind: ToastKind.warning);
      return;
    }
    if (!_confirmed) {
      showToast(context, 'Please confirm you have collected all items',
          kind: ToastKind.warning);
      return;
    }

    setState(() => _confirming = true);
    final result = await Api.patchOrder(order.id, {
      'status': 'picked_up',
      'pickupNotes': _notes.text,
      'pickedUpAt': DateTime.now().toIso8601String(),
    });
    if (!mounted) return;
    setState(() => _confirming = false);

    if (!result.ok) {
      showToast(context, 'Failed to update order', kind: ToastKind.error);
      return;
    }
    Navigator.of(context).pushNamedAndRemoveUntil('/hub/drop', (r) => false);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: Brand.gray50,
        body: Center(
          child:
              Padding(padding: EdgeInsets.all(32), child: Text('Loading...')),
        ),
      );
    }
    final order = _order;
    if (order == null) {
      return const Scaffold(
        backgroundColor: Brand.gray50,
        body: Center(
          child: Padding(
              padding: EdgeInsets.all(32), child: Text('Order not found')),
        ),
      );
    }

    final done = order.status != 'reached_location';

    return Scaffold(
      backgroundColor: Brand.gray50,
      appBar: AppHeader(
        title: 'Confirm',
        onBack: () => Navigator.of(context).pushReplacementNamed(
          '/pickups/start',
          arguments: {'id': order.id},
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
          children: [
            _summaryCard(order),
            const SizedBox(height: 16),
            const Text(
              'Upload Clothes Photos (Min 2)',
              style: TextStyle(
                fontFamily: Brand.heading,
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Colors.black,
              ),
            ),
            const SizedBox(height: 12),
            _photoGrid(),
            const SizedBox(height: 16),
            _uploadButton(),
            const SizedBox(height: 16),
            TextField(
              controller: _notes,
              style: const TextStyle(fontSize: 16, color: Colors.black),
              decoration: InputDecoration(
                hintText: 'Add Notes (optional)…',
                hintStyle: const TextStyle(color: Brand.gray600),
                filled: true,
                fillColor: Brand.surface,
                isDense: false,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(Brand.rXl),
                  borderSide: const BorderSide(color: Brand.gray300),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(Brand.rXl),
                  borderSide: const BorderSide(color: Brand.purple, width: 2),
                ),
              ),
            ),
            const SizedBox(height: 12), // mt-3
            InkWell(
              onTap: () => setState(() => _confirmed = !_confirmed),
              child: Row(
                children: [
                  SizedBox(
                    height: 24,
                    width: 24,
                    child: Checkbox(
                      value: _confirmed,
                      activeColor: Brand.purple,
                      onChanged: (value) =>
                          setState(() => _confirmed = value ?? false),
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'I have collected all items from customer.',
                      style: TextStyle(fontSize: 16, color: Colors.black),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20), // mt-5
            if (done)
              Container(
                height: 48,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: Brand.green600,
                  borderRadius: BorderRadius.circular(Brand.rXl),
                ),
                child: const Text(
                  '✅ Pickup Completed',
                  style: TextStyle(
                    fontFamily: Brand.heading,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              )
            else
              GradientButton(
                label: 'Confirm & Proceed',
                height: 48,
                radius: Brand.rXl,
                busy: _confirming,
                onPressed: (_confirmed && _photos.length >= 2 && !_confirming)
                    ? _confirm
                    : null,
              ),
          ],
        ),
      ),
    );
  }

  Widget _summaryCard(PartnerOrder order) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Brand.surface,
        borderRadius: BorderRadius.circular(Brand.rXl),
        border: Border.all(color: Brand.gray200),
        boxShadow: const [
          BoxShadow(
              color: Color(0x14000000), blurRadius: 6, offset: Offset(0, 1)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Order ID: #${order.orderId}',
                      style: const TextStyle(
                        fontFamily: Brand.heading,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.black,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text('Customer: ${order.customerName}',
                        style:
                            const TextStyle(fontSize: 14, color: Colors.black)),
                    Text('Phone: ${order.customerMobile}',
                        style:
                            const TextStyle(fontSize: 14, color: Colors.black)),
                    const SizedBox(height: 8),
                    Text(
                      '\u{1F4CD} ${order.pickupAddress.shortLine}',
                      style: const TextStyle(fontSize: 14, color: Colors.black),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(Brand.rLg),
                  border: Border.all(color: Brand.inputBorder, width: 2),
                ),
                child: Text(
                  _statusLabel(order.status),
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Brand.purple,
                  ),
                ),
              ),
            ],
          ),
          if (order.items.isNotEmpty) ...[
            const SizedBox(height: 12),
            _itemsButton(order),
          ],
        ],
      ),
    );
  }

  /// The list used to open flat on the screen, so on a big order the photo
  /// upload and the confirm button were pushed well below the fold. It opens
  /// on a tap and covers the screen while the captain counts.
  Widget _itemsButton(PartnerOrder order) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(Brand.rXl),
      child: InkWell(
        borderRadius: BorderRadius.circular(Brand.rXl),
        onTap: () => _showItems(order),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFFF5F3FF), Color(0xFFECFEFF)],
            ),
            border: Border.all(color: const Color(0xFFC7D2FE)),
            borderRadius: BorderRadius.circular(Brand.rXl),
          ),
          child: Row(
            children: [
              Container(
                height: 32,
                width: 32,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Brand.purple, Brand.cyan],
                  ),
                  borderRadius: BorderRadius.circular(Brand.rLg),
                ),
                child: const Center(
                  child: Text('\u{1F4CB}', style: TextStyle(fontSize: 15)),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'View order items',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Brand.purple,
                      ),
                    ),
                    Text(
                      '${order.itemCount} garments · ${rupees(order.totalAmount)}',
                      style:
                          const TextStyle(fontSize: 11, color: Brand.gray600),
                    ),
                  ],
                ),
              ),
              const Text('›',
                  style: TextStyle(fontSize: 18, color: Brand.purple)),
            ],
          ),
        ),
      ),
    );
  }

  void _showItems(PartnerOrder order) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Brand.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(Brand.r2xl)),
      ),
      builder: (context) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.75,
        maxChildSize: 0.9,
        builder: (context, controller) => Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Order items (${order.itemCount})',
                      style: const TextStyle(
                        fontFamily: Brand.heading,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: Colors.black,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close, color: Brand.gray500),
                  ),
                ],
              ),
            ),
            const Divider(height: 1, color: Brand.gray200),
            Expanded(
              child: ListView.separated(
                controller: controller,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: order.items.length,
                separatorBuilder: (_, __) =>
                    const Divider(height: 1, color: Brand.gray100),
                itemBuilder: (context, index) {
                  final item = order.items[index];
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text.rich(
                            TextSpan(
                              style: const TextStyle(
                                  fontSize: 15, color: Colors.black),
                              children: [
                                TextSpan(
                                  text: '${item.quantity}x ',
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w700),
                                ),
                                TextSpan(text: item.name),
                              ],
                            ),
                          ),
                        ),
                        Text(
                          rupees(item.price * item.quantity),
                          style: const TextStyle(
                              fontSize: 15, color: Brand.gray600),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total',
                        style: TextStyle(
                            fontFamily: Brand.heading,
                            fontSize: 16,
                            fontWeight: FontWeight.w700)),
                    Text(rupees(order.totalAmount),
                        style: const TextStyle(
                            fontFamily: Brand.heading,
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: Brand.purple)),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _photoGrid() {
    return GridView.count(
      crossAxisCount: 3,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      children: [
        for (var i = 0; i < _photos.length; i++) _photoTile(i),
        _addTile(),
      ],
    );
  }

  Widget _photoTile(int index) {
    final provider = imageProviderFor(_photos[index]);
    return Stack(
      fit: StackFit.expand,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(Brand.rXl),
          child: Container(
            color: Brand.gray100,
            child: provider == null
                ? null
                : Image(image: provider, fit: BoxFit.cover),
          ),
        ),
        Positioned(
          top: 4,
          right: 4,
          child: GestureDetector(
            onTap: () => setState(() => _photos.removeAt(index)),
            child: Container(
              height: 24,
              width: 24,
              decoration: const BoxDecoration(
                color: Brand.red500,
                shape: BoxShape.circle,
              ),
              child: const Center(
                child: Text('×',
                    style: TextStyle(fontSize: 12, color: Colors.white)),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _addTile() {
    return GestureDetector(
      onTap: _addPhoto,
      child: Container(
        decoration: BoxDecoration(
          color: Brand.gray100,
          borderRadius: BorderRadius.circular(Brand.rXl),
          border: Border.all(color: Brand.purple, width: 2),
        ),
        child: const Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('\u{1F4F7}', style: TextStyle(fontSize: 22)),
              SizedBox(height: 4),
              Text('Add Photo',
                  style: TextStyle(fontSize: 12, color: Brand.purple)),
            ],
          ),
        ),
      ),
    );
  }

  /// Green once there are enough photos, grey until then -- the web screen
  /// uses its own colours here rather than the brand gradient.
  Widget _uploadButton() {
    final ready = _photos.length >= 2;
    return SizedBox(
      height: 48,
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(Brand.rXl),
        child: InkWell(
          borderRadius: BorderRadius.circular(Brand.rXl),
          onTap: ready && !_uploading ? _upload : null,
          child: Ink(
            decoration: BoxDecoration(
              gradient: ready
                  ? const LinearGradient(
                      colors: [Brand.green600, Color(0xFF15803D)])
                  : null,
              color: ready ? null : Brand.disabled,
              borderRadius: BorderRadius.circular(Brand.rXl),
            ),
            child: Center(
              child: _uploading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation(Colors.white),
                      ),
                    )
                  : Text(
                      'Upload Images (${_photos.length}/2)',
                      style: const TextStyle(
                        fontFamily: Brand.heading,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
            ),
          ),
        ),
      ),
    );
  }

  static String _statusLabel(String status) {
    if (status == 'reached_location') return 'Reached Location';
    if (status == 'picked_up') return 'Picked Up';
    if (status.isEmpty) return '';
    final spaced = status.replaceAll('_', ' ');
    return '${spaced[0].toUpperCase()}${spaced.substring(1)}';
  }
}
