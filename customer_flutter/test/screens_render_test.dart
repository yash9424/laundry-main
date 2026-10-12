import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:customerapp/models/customer.dart';
import 'package:customerapp/screens/add_address.dart';
import 'package:customerapp/screens/booking.dart';
import 'package:customerapp/screens/notifications.dart';
import 'package:customerapp/services/store.dart';
import 'package:customerapp/theme/brand.dart';

/// These screens are built from nested rows, a grid and a dropdown inside a
/// fixed-height pill. A layout that does not fit throws rather than merely
/// looking wrong, which is the one kind of mistake reading the code does not
/// catch. Each screen is pumped at a phone's size with nothing answering on
/// the network -- which is also what a customer on a bad connection sees.

/// The test binding ships a font whose every glyph is a square of the font
/// size, so a nine-letter label measures ninety pixels wide and wraps where
/// the real one does not. The app's own fonts are loaded instead; without
/// them every check below reports a fault that exists only in the test.
Future<void> loadAppFonts() async {
  const families = {
    'Montserrat': [
      'assets/fonts/Montserrat-Regular.ttf',
      'assets/fonts/Montserrat-Medium.ttf',
      'assets/fonts/Montserrat-SemiBold.ttf',
      'assets/fonts/Montserrat-Bold.ttf',
    ],
    'Manrope': [
      'assets/fonts/Manrope-Regular.ttf',
      'assets/fonts/Manrope-Medium.ttf',
      'assets/fonts/Manrope-SemiBold.ttf',
      'assets/fonts/Manrope-Bold.ttf',
    ],
  };
  for (final family in families.entries) {
    final loader = FontLoader(family.key);
    for (final path in family.value) {
      loader.addFont(
        File(path).readAsBytes().then((b) => ByteData.view(b.buffer)),
      );
    }
    await loader.load();
  }
}

void main() {
  setUpAll(loadAppFonts);

  setUp(() async {
    SharedPreferences.setMockInitialValues({
      'customerId': 'test-customer',
      'cachedSavedAddresses':
          '[{"street":"12 Example Street, Near the Big Tree","city":"Rajkot",'
          '"state":"Gujarat","pincode":"360001","isDefault":true}]',
      'cachedBookingAddress':
          '{"street":"12 Example Street, Near the Big Tree","city":"Rajkot",'
          '"state":"Gujarat","pincode":"360001","isDefault":true}',
    });
    await Store.init();
  });

  Future<void> pump(WidgetTester tester, Widget screen) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.75;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      MaterialApp(
        theme: Brand.theme(),
        home: screen,
        // Every route this screen can push is a dead end here; the test is
        // about what it draws, not where it goes.
        onGenerateRoute: (settings) =>
            MaterialPageRoute(builder: (_) => const SizedBox.shrink()),
      ),
    );
    await tester.pump(const Duration(milliseconds: 100));
  }

  testWidgets('the legacy booking screen lays out', (tester) async {
    await pump(tester, const BookingScreen());
    expect(find.text('Book Your Order'), findsOneWidget);
    expect(find.text('Select Pickup Day'), findsOneWidget);
    expect(find.text("Today's Pickup Slots"), findsOneWidget);
    expect(find.text('Order Summary'), findsOneWidget);
    expect(find.text('Items: No items selected'), findsOneWidget);
    // The cached address shows before the profile call answers.
    expect(find.text('Change'), findsOneWidget);
    expect(find.text('Confirm Order'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('the notifications screen lays out when empty', (tester) async {
    await pump(tester, const NotificationsScreen());
    expect(find.text('No Notifications'), findsOneWidget);
    expect(
      find.text("You're all caught up! New notifications will appear here."),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('add address opens its form from the dashed button', (
    tester,
  ) async {
    await pump(tester, const AddAddressScreen());
    // The profile call fails here, which leaves the screen with no saved
    // addresses and the form still folded away.
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('+ Add New Address'), findsOneWidget);
    expect(find.text('Save Address'), findsNothing);

    await tester.tap(find.text('+ Add New Address'));
    await tester.pump();

    expect(find.text('Address Line 1'), findsOneWidget);
    expect(find.text('Address Line 2 (Optional)'), findsOneWidget);
    expect(find.text('City'), findsOneWidget);
    expect(find.text('Select State'), findsOneWidget);
    expect(find.text('Pincode'), findsOneWidget);
    expect(find.text('Set as Primary Address'), findsOneWidget);
    expect(find.text('Cancel'), findsOneWidget);
    expect(find.text('Save Address'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  test('an address prints as one line', () {
    final address = CustomerAddress(
      street: '12 Example Street',
      city: 'Rajkot',
      state: 'Gujarat',
      pincode: '360001',
    );
    expect(address.oneLine, '12 Example Street, Rajkot, Gujarat - 360001');
  });
}
