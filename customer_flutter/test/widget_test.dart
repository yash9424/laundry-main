import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:customerapp/theme/brand.dart';
import 'package:customerapp/widgets/common.dart';

void main() {
  testWidgets('a disabled gradient button does not fire', (tester) async {
    var taps = 0;
    await tester.pumpWidget(MaterialApp(
      theme: Brand.theme(),
      home: Scaffold(
        body: Column(
          children: [
            GradientButton(label: 'Enabled', onPressed: () => taps++),
            const GradientButton(label: 'Disabled'),
          ],
        ),
      ),
    ));

    await tester.tap(find.text('Disabled'));
    await tester.pump();
    expect(taps, 0);

    await tester.tap(find.text('Enabled'));
    await tester.pump();
    expect(taps, 1);
  });

  test('rupees() prints whole rupees with the symbol', () {
    expect(rupees(0), '₹0');
    expect(rupees(149.4), '₹149');
    expect(rupees(149.6), '₹150');
  });
}
