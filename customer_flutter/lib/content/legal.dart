/// The Terms and the Privacy Policy, lifted straight out of the screens they
/// replace (customer/src/pages/TermsConditions.tsx and PrivacyPolicy.tsx).
/// Legal copy is not something to paraphrase, so it was extracted rather than
/// retyped.
class LegalSection {
  const LegalSection({this.heading, required this.paragraphs});

  final String? heading;
  final List<String> paragraphs;
}

const List<LegalSection> termsSections = [
  LegalSection(
    heading: '1. Acceptance of Terms',
    paragraphs: [
      'Welcome to Urban Steam, a unit of ACS Group. These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and Urban Steam ("we," "us," or "our") governing your use of the Urban Steam mobile application (the "App") and our steam ironing, pickup, and delivery services (collectively, the "Services"). By creating an account, accessing the App, or using our Services, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree to these Terms, you may not use our Services.',
    ],
  ),
  LegalSection(
    heading: '2. Service Description',
    paragraphs: [
      'Urban Steam provides on-demand steam ironing services. Our Services include the pickup of your garments from your specified location, processing them at our facility, and delivering them back to you. The specific services available are listed within the App.',
    ],
  ),
  LegalSection(
    heading: '3. User Accounts and Orders',
    paragraphs: [
      'a) To use our Services, you must register for an account and provide accurate, current, and complete information.',
      'b) You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.',
      'c) All orders for Services must be placed exclusively through the App.',
    ],
  ),
  LegalSection(
    heading: '4. Pricing and Payments',
    paragraphs: [
      'a) All prices for our Services are listed in Indian Rupees (Rs.) within the App and are subject to change without prior notice.',
      'b) Prices are inclusive of all applicable taxes, including Goods and Services Tax (GST).',
      'c) Payments must be made in full at the time of placing an order through our designated payment gateway, Razorpay, or other methods specified in the App.',
      'd) We do not store your complete payment card details. All payment transactions are processed securely by our third-party payment processors.',
    ],
  ),
  LegalSection(
    heading: '5. Garment Care and Processing',
    paragraphs: [
      'a) Urban Steam will exercise professional care and diligence in the processing of all garments.',
      'b) We are not responsible for any damage resulting from inherent weaknesses, defects, or colour loss in materials that were not apparent prior to processing.',
      'c) We follow the care labels on each garment. In the absence of a care label, we will process the garment using our professional judgment.',
    ],
  ),
  LegalSection(
    heading: '6. Limitation of Liability for Damaged or Lost Items',
    paragraphs: [
      'a) In the rare event of damage or loss of an item that is directly attributable to our handling, you must notify our customer support team in writing within twenty-four (24) hours of delivery.',
      'b) Our total liability for any single damaged or lost item is limited to a maximum of ten (10) times the charge for processing that specific item, as indicated on your invoice.',
      'c) We are not liable for any loss of or damage to personal belongings (such as cash, jewellery, accessories, or other valuables) left in the garments. You agree to check all pockets and garments for such items before handing them over for pickup.',
    ],
  ),
  LegalSection(
    heading: '7. User Responsibilities',
    paragraphs: [
      'You agree to:',
      'a) Inspect all garments for personal belongings before pickup.',
      'b) Not submit any hazardous, dangerous, or illegal materials with your garments.',
      'c) Provide accurate and complete address and contact information.',
      'd) Ensure that you or an authorized representative is available at the specified address during the scheduled pickup and delivery time slots.',
    ],
  ),
  LegalSection(
    heading: '8. Pickup and Delivery',
    paragraphs: [
      'a) All pickups and deliveries must be scheduled through the App.',
      'b) The time slots provided are estimates. We are not liable for delays caused by traffic, weather, or other unforeseen circumstances, but we will make reasonable efforts to keep you informed.',
      'c) A failed pickup or delivery attempt due to your unavailability may result in order cancellation or an additional rescheduling fee.',
    ],
  ),
  LegalSection(
    heading: '9. Cancellation and Refund Policy',
    paragraphs: [
      'a) Cancellation: You may cancel an order free of charge at any time before our delivery partner has been dispatched for pickup via the App. If the rider has already been dispatched, a cancellation fee may apply.',
      'b) Refunds:',
      'i. No refunds will be provided for services that have been successfully completed and delivered.',
      'ii. For service complaints (e.g., quality issues), you must contact our support within 24 hours of delivery. We will investigate and, at our sole discretion, may offer to re-process the item or provide a credit to your account.',
      'iii. Compensation for damaged or lost items is governed by Section 6 of these Terms.',
      'iv. Any approved refunds will be processed to the original payment method within 5-7 business days.',
    ],
  ),
  LegalSection(
    heading: '10. General Limitation of Liability',
    paragraphs: [
      'To the maximum extent permitted by applicable law, ACS Group and Urban Steam, its affiliates, and their respective officers, directors, and employees shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or use, arising out of or in any way connected with your use of the App or Services.',
    ],
  ),
  LegalSection(
    heading: '11. Governing Law and Jurisdiction',
    paragraphs: [
      'These Terms shall be governed by and construed in accordance with the laws of India. Any dispute, claim, or controversy arising out of or relating to these Terms or the breach thereof shall be subject to the exclusive jurisdiction of the courts located in Bengaluru, Karnataka, India.',
    ],
  ),
  LegalSection(
    heading: '12. Compliance with Consumer Protection Law',
    paragraphs: [
      'These Terms are intended to define the relationship between Urban Steam and our Users. However, nothing in these Terms shall be construed to limit or waive any rights, remedies, or protections that a User is granted as a consumer under the mandatory provisions of the Consumer Protection Act, 2019, and any rules made thereunder, or any other applicable consumer law. In the event of any conflict or inconsistency between a provision in these Terms and a mandatory provision of the Consumer Protection Act, 2019, the provisions of the Act shall prevail to the extent of such conflict.',
    ],
  ),
  LegalSection(
    heading: '13. Severability',
    paragraphs: [
      'If any provision of these Terms is found to be invalid, illegal, or unenforceable by a court or competent authority under the Consumer Protection Act, 2019 or any other law, the validity, legality, and enforceability of the remaining provisions will not in any way be affected or impaired. Such a provision shall be deemed modified to the minimum extent necessary to make it valid, legal, and enforceable.',
    ],
  ),
  LegalSection(
    heading: '14. Contact Information',
    paragraphs: [
      'For any questions, support, or to report an issue regarding these Terms or our Services, please contact us at:',
      'Support Email: support@urbansteam.in',
    ],
  ),
];

const List<LegalSection> privacySections = [
  LegalSection(
    paragraphs: [
      'Urban Steam ("we," "our," or "us") is committed to protecting your privacy. This policy outlines how we collect, use, and safeguard your information when you use our mobile application and services (collectively, the "Services").',
    ],
  ),
  LegalSection(
    heading: '1. Information We Collect',
    paragraphs: [
      'We collect information to provide and improve our Services:',
      'a) Personal Information: Such as your name, phone number, email address, and physical address when you create an account or place an order.',
      'b) Order Information: Details of the services you request and your service history.',
      'c) Location Data: To facilitate the pickup and delivery of your garments.',
      'd) Payment Information: We use third-party payment processors (like Razorpay). We do not store your full payment card details on our servers.',
      'e) Automated Information: We use cookies and similar tracking technologies to collect data about your device and your interaction with our App.',
    ],
  ),
  LegalSection(
    heading: '2. How We Use Your Information',
    paragraphs: [
      'We use the information we collect for the following purposes:',
      'a) To create, manage, and secure your account.',
      'b) To process your orders, arrange pickups and deliveries, and process payments.',
      'c) To communicate with you about your orders, promotions, and updates.',
      'd) To analyze and improve our App and Services.',
    ],
  ),
  LegalSection(
    heading: '3. Information Sharing and Disclosure',
    paragraphs: [
      'We do not sell your personal data. We may share your information in the following limited circumstances:',
      'a) With our delivery partners to fulfil pickup and delivery.',
      'b) With our payment processors to complete your transactions.',
      'c) Where required by law or to protect our rights and the safety of our users.',
    ],
  ),
  LegalSection(
    heading: '4. Cookie Policy',
    paragraphs: [
      'a) What are Cookies? Cookies are small text files stored on your device when you use our App. They help us remember your preferences and understand how you use our Services.',
      'b) Why We Use Cookies: We use cookies for essential functions like user authentication, session management, and to remember your login details. We also use analytical cookies to understand user behavior and improve our App\'s performance.',
      'c) Your Control: Most devices allow you to disable cookies through your settings. However, disabling essential cookies may affect the core functionality of the App.',
    ],
  ),
  LegalSection(
    heading: '5. Data Security',
    paragraphs: [
      'We implement reasonable administrative, technical, and physical security measures designed to protect your personal information from unauthorized access, loss, or alteration.',
    ],
  ),
  LegalSection(
    heading: '6. Your Rights',
    paragraphs: [
      'You have the right to access, correct, or update the personal information in your account profile at any time. If you wish to delete your account, please contact us at support@urbansteam.in.',
    ],
  ),
  LegalSection(
    heading: '7. Changes to This Policy',
    paragraphs: [
      'We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date.',
    ],
  ),
  LegalSection(
    heading: '8. Contact Us',
    paragraphs: [
      'For any questions about this Privacy Policy or your data, please contact us at:',
      'Email: support@urbansteam.in',
    ],
  ),
];
