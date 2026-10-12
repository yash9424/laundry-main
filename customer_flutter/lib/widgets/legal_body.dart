import 'package:flutter/material.dart';

import '../content/legal.dart';

/// Renders a list of legal sections: bold heading, then its paragraphs.
class LegalBody extends StatelessWidget {
  const LegalBody({super.key, required this.sections, this.padding});

  final List<LegalSection> sections;
  final EdgeInsets? padding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding ?? const EdgeInsets.fromLTRB(16, 20, 16, 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final section in sections) ...[
            if (section.heading != null) ...[
              Text(
                section.heading!,
                // <h2 class="text-lg font-bold">
                style: const TextStyle(
                  fontFamily: 'Montserrat',
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
            ],
            for (final paragraph in section.paragraphs) ...[
              Text(
                paragraph,
                // <p class="text-sm leading-relaxed">
                style: const TextStyle(
                  fontSize: 14,
                  height: 1.625,
                  color: Color(0xFF1F2937),
                ),
              ),
              const SizedBox(height: 8),
            ],
            const SizedBox(height: 14),
          ],
        ],
      ),
    );
  }
}
