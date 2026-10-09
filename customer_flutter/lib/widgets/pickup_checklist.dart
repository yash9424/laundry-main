import 'package:flutter/material.dart';

import '../models/order_charges.dart';
import '../services/api.dart';
import '../theme/brand.dart';

/// Shown before the captain arrives: what the customer should have ready, what
/// we will and will not take responsibility for, and the paper reuse note.
/// Every line is editable in Admin > Add-On > Charges; the defaults in
/// OrderChargesConfig are used until a setting is saved.
///
/// `plain` drops the white panel so the list can sit inside something that
/// already is one.
class PickupChecklist extends StatefulWidget {
  const PickupChecklist({super.key, this.plain = false});

  final bool plain;

  @override
  State<PickupChecklist> createState() => _PickupChecklistState();
}

class _PickupChecklistState extends State<PickupChecklist> {
  OrderChargesConfig _content = OrderChargesConfig.defaults();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final result = await Api.orderCharges();
    if (!mounted || !result.ok) return;
    setState(() => _content = OrderChargesConfig.fromJson(result.map));
  }

  @override
  Widget build(BuildContext context) {
    if (!_content.checklistEnabled) return const SizedBox.shrink();

    final body = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (!widget.plain) ...[
          Text(
            _content.checklistTitle,
            style: const TextStyle(
              fontFamily: 'Montserrat',
              fontSize: 15,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
        ],
        if (_content.checklistIntro.isNotEmpty) ...[
          Text(
            _content.checklistIntro,
            style: const TextStyle(fontSize: 13.5, color: Brand.gray600),
          ),
          const SizedBox(height: 12),
        ],
        for (final point in _content.checklistPoints)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  height: 17,
                  width: 17,
                  margin: const EdgeInsets.only(top: 2),
                  decoration: const BoxDecoration(
                    gradient: Brand.gradient,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.check, size: 11, color: Colors.white),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    point,
                    style: const TextStyle(
                      fontSize: 13.5,
                      height: 1.5,
                      color: Color(0xFF374151),
                    ),
                  ),
                ),
              ],
            ),
          ),
        if (_content.checklistNote.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(
            _content.checklistNote,
            style: const TextStyle(
              fontSize: 13.5,
              height: 1.5,
              color: Color(0xFF374151),
            ),
          ),
          const SizedBox(height: 12),
        ],
        if (_content.importantText.isNotEmpty)
          _notice(
            icon: Icons.warning_amber_rounded,
            iconColor: const Color(0xFFD97706),
            background: const Color(0xFFFFFBEB),
            border: const Color(0xFFFDE68A),
            title: _content.importantTitle,
            titleColor: const Color(0xFFB45309),
            text: _content.importantText,
            textColor: const Color(0xFF92400E),
          ),
        if (_content.sustainabilityText.isNotEmpty) ...[
          const SizedBox(height: 12),
          _notice(
            icon: Icons.recycling,
            iconColor: const Color(0xFF16A34A),
            background: const Color(0xFFF0FDF4),
            border: const Color(0xFFBBF7D0),
            title: _content.sustainabilityTitle,
            titleColor: const Color(0xFF15803D),
            text: _content.sustainabilityText,
            textColor: const Color(0xFF166534),
          ),
        ],
      ],
    );

    if (widget.plain) return body;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFEDE9FE), width: 2),
        boxShadow: const [
          BoxShadow(color: Color(0x11000000), blurRadius: 10, offset: Offset(0, 3)),
        ],
      ),
      child: body,
    );
  }

  Widget _notice({
    required IconData icon,
    required Color iconColor,
    required Color background,
    required Color border,
    required String title,
    required Color titleColor,
    required String text,
    required Color textColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 1),
            child: Icon(icon, size: 17, color: iconColor),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (title.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 2),
                    child: Text(
                      title,
                      style: TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w700,
                        color: titleColor,
                      ),
                    ),
                  ),
                Text(
                  text,
                  style: TextStyle(fontSize: 13.5, height: 1.5, color: textColor),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
