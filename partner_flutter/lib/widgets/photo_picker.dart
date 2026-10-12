import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../theme/brand.dart';

/// Pictures in this system are stored as base64 data URLs inside the Mongo
/// document, not as files, so everything the captain photographs has to come
/// back as a data URL. They are also re-encoded small: a KYC document shot at
/// full resolution on a modern phone is several megabytes, and several of
/// those in one partner record is enough to run into Mongo's document limit.
Future<String?> pickImageAsDataUrl(
  BuildContext context, {
  bool allowCamera = true,
}) async {
  final picker = ImagePicker();
  ImageSource? source = ImageSource.gallery;

  if (allowCamera) {
    source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: Brand.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(Brand.r2xl)),
      ),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading:
                  const Icon(Icons.photo_camera_outlined, color: Brand.purple),
              title: const Text('Take a photo'),
              onTap: () => Navigator.of(context).pop(ImageSource.camera),
            ),
            ListTile(
              leading:
                  const Icon(Icons.photo_library_outlined, color: Brand.purple),
              title: const Text('Choose from gallery'),
              onTap: () => Navigator.of(context).pop(ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
  }

  if (source == null) return null;

  final file = await picker.pickImage(
    source: source,
    maxWidth: 1280,
    maxHeight: 1280,
    imageQuality: 70,
  );
  if (file == null) return null;

  final bytes = await file.readAsBytes();
  return 'data:image/jpeg;base64,${base64Encode(bytes)}';
}

/// Decodes whatever the server or the picker gave us into something drawable:
/// a data URL, a relative upload path, or nothing.
ImageProvider? imageProviderFor(String? value) {
  if (value == null || value.isEmpty) return null;
  if (value.startsWith('data:')) {
    final comma = value.indexOf(',');
    if (comma < 0) return null;
    try {
      return MemoryImage(base64Decode(value.substring(comma + 1)));
    } catch (_) {
      return null;
    }
  }
  if (value.startsWith('http')) return NetworkImage(value);
  return null;
}

/// The round "+" avatar on the create-profile screen: `size-28`, grey, with a
/// purple plus until a picture is chosen.
class AvatarPicker extends StatelessWidget {
  const AvatarPicker({
    super.key,
    required this.dataUrl,
    required this.onTap,
    this.caption = 'Add Profile Photo',
  });

  final String? dataUrl;
  final VoidCallback onTap;
  final String caption;

  @override
  Widget build(BuildContext context) {
    final provider = imageProviderFor(dataUrl);
    return Column(
      children: [
        GestureDetector(
          onTap: onTap,
          child: Container(
            height: 112, // size-28
            width: 112,
            decoration: BoxDecoration(
              color: Brand.gray100,
              shape: BoxShape.circle,
              border: Border.all(color: Brand.gray200),
              image: provider == null
                  ? null
                  : DecorationImage(image: provider, fit: BoxFit.cover),
            ),
            child: provider != null
                ? null
                : const Center(
                    child: Text(
                      '+',
                      style: TextStyle(fontSize: 30, color: Brand.purple),
                    ),
                  ),
          ),
        ),
        const SizedBox(height: 12), // mt-3
        Text(
          caption,
          style: const TextStyle(
              fontSize: 14, height: Brand.leadSm, color: Brand.gray600),
        ),
      ],
    );
  }
}

/// The bordered field used all through the profile and KYC forms:
/// `rounded-xl border-2 pl-9 pr-3 py-3`, with an emoji sitting inside on the
/// left and the border turning purple on focus.
class BrandField extends StatelessWidget {
  const BrandField({
    super.key,
    required this.controller,
    required this.hint,
    this.glyph,
    this.keyboardType,
    this.inputFormatters,
    this.maxLength,
    this.fontSize = 16,
    this.onChanged,
    this.enabled = true,
    this.maxLines = 1,
  });

  final TextEditingController controller;
  final String hint;
  final String? glyph;
  final TextInputType? keyboardType;
  final List<dynamic>? inputFormatters;
  final int? maxLength;
  final double fontSize;
  final ValueChanged<String>? onChanged;
  final bool enabled;
  final int maxLines;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      maxLength: maxLength,
      maxLines: maxLines,
      enabled: enabled,
      onChanged: onChanged,
      inputFormatters: inputFormatters?.cast(),
      style: TextStyle(
        fontSize: fontSize,
        color: enabled ? Colors.black : Brand.gray500,
      ),
      decoration: InputDecoration(
        hintText: hint,
        counterText: '',
        filled: !enabled,
        fillColor: Brand.gray100,
        hintStyle: const TextStyle(color: Brand.gray400),
        isDense: false,
        prefixIcon: glyph == null
            ? null
            : Padding(
                padding: const EdgeInsets.only(left: 12, right: 6),
                child: Text(glyph!, style: const TextStyle(fontSize: 15)),
              ),
        prefixIconConstraints: const BoxConstraints(minWidth: 0, minHeight: 0),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 12), // py-3
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(Brand.rXl),
          borderSide: const BorderSide(color: Brand.inputBorder, width: 2),
        ),
        disabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(Brand.rXl),
          borderSide: const BorderSide(color: Brand.gray200, width: 2),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(Brand.rXl),
          borderSide: const BorderSide(color: Brand.purple, width: 2),
        ),
      ),
    );
  }
}
