import 'package:flutter/material.dart';

import '../content/legal.dart';

/// Renders a list of legal sections: bold heading, then its paragraphs.
///
/// The page is `px-4 py-6 space-y-6`, each section a `<h2 class="text-lg
/// font-bold mb-2">` over paragraphs that sit `space-y-2` apart. `space-y`
/// puts a gap *between* children and none after the last, so the spacing is
/// written that way here rather than as trailing padding.
class LegalBody extends StatelessWidget {
  const LegalBody({super.key, required this.sections, this.padding});

  final List<LegalSection> sections;
  final EdgeInsets? padding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding ?? const EdgeInsets.fromLTRB(16, 24, 16, 24), // py-6
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var s = 0; s < sections.length; s++) ...[
            if (s > 0) const SizedBox(height: 24), // space-y-6
            if (sections[s].heading != null) ...[
              Text(
                sections[s].heading!,
                // <h2 class="text-lg font-bold">
                style: const TextStyle(
                  fontFamily: 'Montserrat',
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8), // mb-2
            ],
            for (var p = 0; p < sections[s].paragraphs.length; p++) ...[
              if (p > 0) const SizedBox(height: 8), // space-y-2
              Text(
                sections[s].paragraphs[p],
                // <p class="text-sm leading-relaxed">
                style: const TextStyle(
                  fontSize: 14,
                  height: 1.625,
                  color: Color(0xFF1F2937),
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }
}
