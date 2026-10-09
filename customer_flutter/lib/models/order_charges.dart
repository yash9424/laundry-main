/// The single OrderCharges config document, which carries far more than
/// charges: the express delivery price and wording, the home screen's two
/// delivery card labels, the "How To Order" steps, the pre-pickup checklist and
/// the cancellation policy text. Everything here is editable in
/// Admin > Add-On > Order Charges, so each field falls back to the same default
/// the web app used when the setting has never been saved.
class OrderChargesConfig {
  OrderChargesConfig({
    required this.cancellationPercentage,
    required this.cancellationPolicyText,
    required this.garmentCarePolicyText,
    required this.damageLossPolicyText,
    required this.expressEnabled,
    required this.expressPrice,
    required this.expressLabel,
    required this.expressDescription,
    required this.homeStandardTitle,
    required this.homeStandardSubtitle,
    required this.homeExpressTitle,
    required this.homeExpressSubtitle,
    required this.todaySlotsEnabled,
    required this.tomorrowSlotsEnabled,
    required this.expressCutoffHour,
    required this.expressLeadTimeMinutes,
    required this.howToOrderTitle,
    required this.howToOrderSteps,
    required this.checklistEnabled,
    required this.checklistTitle,
    required this.checklistIntro,
    required this.checklistPoints,
    required this.checklistNote,
    required this.importantTitle,
    required this.importantText,
    required this.sustainabilityTitle,
    required this.sustainabilityText,
  });

  final num cancellationPercentage;
  final String cancellationPolicyText;

  /// Admin-supplied policy copy. When empty the matching Terms section is
  /// shown instead, which is what the web screen fell back to.
  final String garmentCarePolicyText;
  final String damageLossPolicyText;

  final bool expressEnabled;
  final num expressPrice;
  final String expressLabel;
  final String expressDescription;

  final String homeStandardTitle;
  final String homeStandardSubtitle;
  final String homeExpressTitle;
  final String homeExpressSubtitle;

  final bool todaySlotsEnabled;
  final bool tomorrowSlotsEnabled;

  /// Same-day express shuts at this hour, whatever slots remain on paper, and
  /// an express slot needs this much notice before it starts.
  final int expressCutoffHour;
  final int expressLeadTimeMinutes;

  final String howToOrderTitle;
  final List<HowToStep> howToOrderSteps;

  final bool checklistEnabled;
  final String checklistTitle;
  final String checklistIntro;
  final List<String> checklistPoints;
  final String checklistNote;
  final String importantTitle;
  final String importantText;
  final String sustainabilityTitle;
  final String sustainabilityText;

  static const defaultHowToSteps = [
    HowToStep('Choose Your Garments',
        'Count your garments and tap "+" to add them.'),
    HowToStep('Review Your Cart',
        'Items are saved to your cart automatically. Tap the total bar or Cart below to check your order.'),
    HowToStep('Pick a Slot & Pay',
        'Choose your pickup slot and complete payment.'),
    HowToStep('Relax', "We'll take care of the rest."),
  ];

  static const defaultChecklistPoints = [
    'The garment quantities match your booking.',
    'Garments are added under the correct categories (for example, Linen Shirts and Silk Sarees).',
    'The garments are kept ready as per your booking.',
  ];

  static OrderChargesConfig defaults() => OrderChargesConfig(
        cancellationPercentage: 20,
        cancellationPolicyText: '',
        garmentCarePolicyText: '',
        damageLossPolicyText: '',
        expressEnabled: true,
        expressPrice: 0,
        expressLabel: 'Express Delivery',
        expressDescription: '',
        homeStandardTitle: 'Standard Delivery',
        homeStandardSubtitle: '24-hour turnaround',
        homeExpressTitle: 'Express Delivery',
        homeExpressSubtitle: '12-hour turnaround — for a small fee',
        todaySlotsEnabled: true,
        tomorrowSlotsEnabled: true,
        expressCutoffHour: 18,
        expressLeadTimeMinutes: 90,
        howToOrderTitle: 'How To Order',
        howToOrderSteps: defaultHowToSteps,
        checklistEnabled: true,
        checklistTitle: 'Before your pickup',
        checklistIntro: 'For a smooth pickup, please ensure that:',
        checklistPoints: defaultChecklistPoints,
        checklistNote:
            'Our pickup team will collect only the garments included in the confirmed booking.',
        importantTitle: 'Important',
        importantText:
            'Urban Steam does not take responsibility for cash, jewellery, or any personal items left inside garments. Kindly check all pockets before handing over your clothes.',
        sustainabilityTitle: 'A small step towards sustainable service',
        sustainabilityText:
            "If the paper inside your garments is still clean and usable, you can keep it aside for us. We'll be happy to collect and reuse it with your next pickup.",
      );

  static String _text(Object? value, String fallback) {
    final s = value?.toString().trim();
    return (s == null || s.isEmpty) ? fallback : s;
  }

  static List<String> _lines(Object? value) =>
      (value?.toString() ?? '')
          .split(RegExp(r'\r?\n'))
          .map((l) => l.trim())
          .where((l) => l.isNotEmpty)
          .toList();

  factory OrderChargesConfig.fromJson(Map<String, dynamic> json) {
    final d = defaults();

    // One step per line, written as "Title | Description".
    final steps = _lines(json['howToOrderSteps']).map((line) {
      final parts = line.split('|');
      return HowToStep(
        parts.first.trim(),
        parts.length > 1 ? parts.sublist(1).join('|').trim() : '',
      );
    }).where((s) => s.title.isNotEmpty).toList();

    final points = _lines(json['pickupChecklistPoints']);

    return OrderChargesConfig(
      cancellationPercentage:
          num.tryParse(json['cancellationPercentage']?.toString() ?? '') ??
              d.cancellationPercentage,
      cancellationPolicyText:
          _text(json['cancellationPolicyText'], d.cancellationPolicyText),
      garmentCarePolicyText:
          _text(json['garmentCarePolicyText'], d.garmentCarePolicyText),
      damageLossPolicyText:
          _text(json['damageLossPolicyText'], d.damageLossPolicyText),
      expressEnabled: json['expressDeliveryEnabled'] != false,
      expressPrice:
          num.tryParse(json['expressDeliveryPrice']?.toString() ?? '') ?? 0,
      expressLabel: _text(json['expressDeliveryLabel'], d.expressLabel),
      expressDescription:
          _text(json['expressDeliveryDescription'], d.expressDescription),
      homeStandardTitle: _text(json['homeStandardTitle'], d.homeStandardTitle),
      homeStandardSubtitle:
          _text(json['homeStandardSubtitle'], d.homeStandardSubtitle),
      homeExpressTitle: _text(json['homeExpressTitle'], d.homeExpressTitle),
      homeExpressSubtitle:
          _text(json['homeExpressSubtitle'], d.homeExpressSubtitle),
      todaySlotsEnabled: json['todaySlotsEnabled'] != false,
      tomorrowSlotsEnabled: json['tomorrowSlotsEnabled'] != false,
      expressCutoffHour:
          int.tryParse(json['expressCutoffHour']?.toString() ?? '') ?? 18,
      expressLeadTimeMinutes:
          int.tryParse(json['expressLeadTimeMinutes']?.toString() ?? '') ?? 90,
      howToOrderTitle: _text(json['howToOrderTitle'], d.howToOrderTitle),
      howToOrderSteps: steps.isNotEmpty ? steps : d.howToOrderSteps,
      checklistEnabled: json['pickupChecklistEnabled'] != false,
      checklistTitle: _text(json['pickupChecklistTitle'], d.checklistTitle),
      checklistIntro: _text(json['pickupChecklistIntro'], d.checklistIntro),
      checklistPoints: points.isNotEmpty ? points : d.checklistPoints,
      checklistNote: _text(json['pickupChecklistNote'], d.checklistNote),
      importantTitle: _text(json['pickupImportantTitle'], d.importantTitle),
      importantText: _text(json['pickupImportantText'], d.importantText),
      sustainabilityTitle:
          _text(json['pickupSustainabilityTitle'], d.sustainabilityTitle),
      sustainabilityText:
          _text(json['pickupSustainabilityText'], d.sustainabilityText),
    );
  }
}

class HowToStep {
  const HowToStep(this.title, this.description);

  final String title;
  final String description;
}

/// WalletSettings: points rates, referral bonuses and the minimum order value.
class WalletSettings {
  WalletSettings({
    required this.minOrderPrice,
    required this.pointsPerRupee,
    required this.minRedeemPoints,
    required this.referralPoints,
    required this.signupBonusPoints,
    required this.orderCompletionPoints,
  });

  final num minOrderPrice;
  final num pointsPerRupee;
  final num minRedeemPoints;
  final num referralPoints;
  final num signupBonusPoints;
  final num orderCompletionPoints;

  factory WalletSettings.fromJson(Map<String, dynamic> json) {
    num pick(String key, num fallback) =>
        num.tryParse(json[key]?.toString() ?? '') ?? fallback;
    return WalletSettings(
      minOrderPrice: pick('minOrderPrice', 0),
      pointsPerRupee: pick('pointsPerRupee', 1),
      minRedeemPoints: pick('minRedeemPoints', 0),
      referralPoints: pick('referralPoints', 0),
      signupBonusPoints: pick('signupBonusPoints', 0),
      orderCompletionPoints: pick('orderCompletionPoints', 0),
    );
  }

  static WalletSettings defaults() => WalletSettings(
        minOrderPrice: 0,
        pointsPerRupee: 1,
        minRedeemPoints: 0,
        referralPoints: 0,
        signupBonusPoints: 0,
        orderCompletionPoints: 0,
      );
}
