import 'package:flutter/material.dart';

import '../content/legal.dart';
import '../theme/brand.dart';
import '../widgets/legal_body.dart';
import '../widgets/common.dart';

class TermsConditionsScreen extends StatelessWidget {
  const TermsConditionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _LegalScreen(
      title: 'Terms & Conditions',
      sections: termsSections,
    );
  }
}

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _LegalScreen(
      title: 'Privacy Policy',
      sections: privacySections,
    );
  }
}

class _LegalScreen extends StatelessWidget {
  const _LegalScreen({required this.title, required this.sections});

  final String title;
  final List<LegalSection> sections;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Brand.gray50,
      appBar: PageHeader(title, gradient: true, titleSize: 20, iconSize: 24),
      body: SingleChildScrollView(
        child: LegalBody(sections: sections),
      ),
    );
  }
}
