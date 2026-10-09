import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../theme/brand.dart';
import 'common.dart';

/// Asks whether to use the camera or the gallery, then returns the chosen photo
/// as a base64 data URL -- which is how profile photos are stored and sent.
/// Returns null if the person backed out.
Future<String?> pickProfilePhoto(BuildContext context) async {
  final source = await showModalBottomSheet<ImageSource>(
    context: context,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (sheetContext) => SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Select Photo',
                    style: TextStyle(
                      fontFamily: 'Montserrat',
                      fontSize: 17,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(sheetContext).pop(),
                ),
              ],
            ),
            const SizedBox(height: 4),
            _option(
              sheetContext,
              Icons.photo_camera_outlined,
              'Take Photo',
              ImageSource.camera,
            ),
            const SizedBox(height: 10),
            _option(
              sheetContext,
              Icons.photo_library_outlined,
              'Choose from Gallery',
              ImageSource.gallery,
            ),
          ],
        ),
      ),
    ),
  );

  if (source == null) return null;

  try {
    final file = await ImagePicker().pickImage(
      source: source,
      maxWidth: 300,
      maxHeight: 300,
      imageQuality: 80,
    );
    if (file == null) return null;
    final bytes = await file.readAsBytes();
    final mime = file.mimeType ??
        (file.path.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
    return 'data:$mime;base64,${base64Encode(bytes)}';
  } catch (_) {
    if (context.mounted) {
      showToast(context, 'Could not use that photo.', error: true);
    }
    return null;
  }
}

Widget _option(
  BuildContext context,
  IconData icon,
  String label,
  ImageSource source,
) {
  return Material(
    color: const Color(0xFFF9FAFB),
    borderRadius: BorderRadius.circular(14),
    child: InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: () => Navigator.of(context).pop(source),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        child: Row(
          children: [
            Icon(icon, color: const Color(0xFF3B82F6)),
            const SizedBox(width: 12),
            Text(label, style: const TextStyle(fontSize: 15)),
          ],
        ),
      ),
    ),
  );
}

/// The round profile picture with the little plus badge.
///
/// `w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500`, a
/// 40px white person glyph, and a 24px blue-500 badge hanging off the corner.
class AvatarPicker extends StatelessWidget {
  const AvatarPicker({
    super.key,
    required this.dataUrl,
    required this.onTap,
    this.caption = 'Tap to add photo',
    this.size = 80,
  });

  /// A base64 data URL, a remote URL, or null for the placeholder.
  final String? dataUrl;
  final VoidCallback onTap;
  final String caption;
  final double size;

  static const _gradient = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [Color(0xFFA855F7), Color(0xFF06B6D4)], // purple-500 -> cyan-500
  );

  Widget _picture() {
    final image = dataUrl;
    if (image == null || image.isEmpty) {
      return const Icon(Icons.person, size: 40, color: Colors.white);
    }
    if (image.startsWith('data:')) {
      try {
        return Image.memory(
          base64Decode(image.split(',').last),
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) =>
              const Icon(Icons.person, size: 40, color: Colors.white),
        );
      } catch (_) {
        return const Icon(Icons.person, size: 40, color: Colors.white);
      }
    }
    return Image.network(
      image,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) =>
          const Icon(Icons.person, size: 40, color: Colors.white),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            GestureDetector(
              onTap: onTap,
              child: Container(
                height: size,
                width: size,
                clipBehavior: Clip.antiAlias,
                decoration: const BoxDecoration(
                  gradient: _gradient,
                  shape: BoxShape.circle,
                ),
                child: _picture(),
              ),
            ),
            Positioned(
              right: -4, // -right-1
              bottom: -4, // -bottom-1
              child: GestureDetector(
                onTap: onTap,
                child: Container(
                  height: 24, // w-6 h-6
                  width: 24,
                  decoration: const BoxDecoration(
                    color: Brand.blue500,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                          color: Color(0x33000000),
                          blurRadius: 6,
                          offset: Offset(0, 2)),
                    ],
                  ),
                  child: const Icon(Icons.add, size: 12, color: Colors.white),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8), // mt-2
        Text(
          caption,
          style: const TextStyle(color: Brand.gray600, fontSize: 12),
        ),
      ],
    );
  }
}
