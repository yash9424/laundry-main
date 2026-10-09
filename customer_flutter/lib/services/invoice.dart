import 'dart:typed_data';

import 'package:flutter/foundation.dart' show debugPrint;
import 'package:flutter/services.dart' show rootBundle;
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import '../models/order.dart';
import 'api.dart';

/// Builds and shares the tax invoice for an order.
///
/// Same layout as the jsPDF version it replaces: the two logos, the three-column
/// issued / billed-to / from block, the service table, then the summary taken
/// from the breakdown saved on the order.
///
/// One deliberate difference: where a field is missing this prints nothing
/// rather than the sample values the web version fell back to. That fallback
/// put a Rajkot address, the phone number 8140126027 and order id RW0R7 on a
/// real customer's invoice whenever a field was absent, which is wrong on a tax
/// document.
class Invoice {
  Invoice._();

  // Invoice identity is admin-editable (Add-On > Charges); these are fallbacks.
  static const _gstFallback = '29ACLFAA519M1ZW';
  static const _emailFallback = 'support@urbansteam.in';

  static final _dayMonthYear = DateFormat('dd/MM/yyyy');

  static Future<({String gst, String email})> _identity() async {
    final result = await Api.orderCharges();
    if (result.ok) {
      final gst = result.map['invoiceGstNumber']?.toString();
      final email = result.map['invoiceSupportEmail']?.toString();
      return (
        gst: (gst == null || gst.isEmpty) ? _gstFallback : gst,
        email: (email == null || email.isEmpty) ? _emailFallback : email,
      );
    }
    return (gst: _gstFallback, email: _emailFallback);
  }

  /// Returns null on success, or a message to show the customer.
  static Future<String?> shareFor(
    CustomerOrder order, {
    String? customerName,
    String? customerMobile,
  }) async {
    try {
      final identity = await _identity();
      final bytes = await _build(
        order,
        identity: identity,
        customerName: customerName,
        customerMobile: customerMobile,
      );
      await Printing.sharePdf(
        bytes: bytes,
        filename:
            'Invoice_${order.orderId.isEmpty ? 'order' : order.orderId}.pdf',
      );
      return null;
    } catch (e, stack) {
      // The customer gets a plain message; the reason goes to the log, which is
      // the only way to tell a missing asset from a failed share.
      debugPrint('Invoice failed for ${order.orderId}: $e\n$stack');
      return 'Failed to create invoice. Please try again.';
    }
  }

  static Future<Uint8List> _build(
    CustomerOrder order, {
    required ({String gst, String email}) identity,
    String? customerName,
    String? customerMobile,
  }) async {
    final acs = pw.MemoryImage(
      (await rootBundle.load(
        'assets/images/invoice_acs_logo.png',
      )).buffer.asUint8List(),
    );
    final mark = pw.MemoryImage(
      (await rootBundle.load(
        'assets/images/invoice_urban_steam_mark.png',
      )).buffer.asUint8List(),
    );

    final breakdown = order.breakdown;
    final issued = order.createdAt == null
        ? ''
        : _dayMonthYear.format(order.createdAt!);
    final address = order.pickupAddress;

    final summary = <({String label, String value, bool emphasis})>[
      (
        label: 'Delivery Type',
        value: order.expressDelivery ? 'Express Delivery' : 'Standard Delivery',
        emphasis: false,
      ),
      (
        label: 'Subtotal',
        value: 'Rs.${breakdown.subtotal.round()}',
        emphasis: false,
      ),
      (label: 'Tax (0%)', value: 'Rs.0.00', emphasis: false),
      if (breakdown.express > 0)
        (
          label: 'Express Delivery Fee',
          value: '+ Rs.${breakdown.express.round()}',
          emphasis: false,
        ),
      if (breakdown.due > 0)
        (
          label: 'Previous Due',
          value: '+ Rs.${breakdown.due.round()}',
          emphasis: false,
        ),
      if (breakdown.discount > 0)
        (
          label:
              'Discount'
              '${breakdown.subtotal > 0 ? ' - ${((breakdown.discount / breakdown.subtotal) * 100).round()}%' : ''}',
          value: '- Rs.${breakdown.discount.round()}',
          emphasis: false,
        ),
      (label: 'Total', value: 'Rs.${breakdown.total.round()}', emphasis: true),
      if (breakdown.wallet > 0)
        (
          label: 'Paid from wallet',
          value: 'Rs.${breakdown.wallet.round()}',
          emphasis: false,
        ),
      if ((breakdown.paidOnline ?? 0) > 0)
        (
          label: 'Paid online',
          value: 'Rs.${breakdown.paidOnline!.round()}',
          emphasis: false,
        ),
    ];

    final doc = pw.Document();
    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.fromLTRB(15, 12, 15, 24),
        footer: (context) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text(
              'Thank you for choosing Urban Steam',
              style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold),
            ),
            pw.SizedBox(height: 3),
            pw.Text(
              'In case of any issues contact ${identity.email} '
              'within 24 hours of delivery',
              style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey600),
            ),
          ],
        ),
        build: (context) => [
          pw.Row(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Image(acs, width: 45, height: 40, fit: pw.BoxFit.contain),
              pw.Image(mark, width: 35, height: 32, fit: pw.BoxFit.contain),
            ],
          ),
          pw.SizedBox(height: 4),
          pw.Text(
            'ORIGINAL FOR RECIPIENT',
            style: const pw.TextStyle(fontSize: 8),
          ),
          pw.SizedBox(height: 4),
          pw.Text(
            'TAX INVOICE',
            style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold),
          ),
          if (order.orderId.isNotEmpty)
            pw.Text(
              '#${order.orderId}',
              style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey700),
            ),
          pw.SizedBox(height: 14),
          // A table rather than a Row of Expandeds: the dividing rules have to
          // run the full height of the tallest column, and `stretch` inside a
          // MultiPage leaves the row unbounded, which fails the whole layout.
          pw.Table(
            border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.2),
            columnWidths: const {
              0: pw.FlexColumnWidth(3),
              1: pw.FlexColumnWidth(4),
              2: pw.FlexColumnWidth(4),
            },
            children: [
              pw.TableRow(
                children: [
                  _block([
                    _label('Issued'),
                    _value(issued),
                    pw.SizedBox(height: 6),
                    _label('Due'),
                    _value(issued),
                  ]),
                  _block([
                    _label('Billed to'),
                    if ((customerName ?? '').isNotEmpty) _value(customerName!),
                    if (address != null) ...[
                      if (address.street.isNotEmpty) _value(address.street),
                      _value(
                        [
                              address.city,
                              address.state,
                            ].where((p) => p.isNotEmpty).join(', ') +
                            (address.pincode.isEmpty
                                ? ''
                                : ' - ${address.pincode}'),
                      ),
                    ],
                    pw.SizedBox(height: 6),
                    if ((customerMobile ?? '').isNotEmpty)
                      _small('Contact Number: $customerMobile'),
                    if (order.orderId.isNotEmpty)
                      _small('Order Id: ${order.orderId}'),
                  ]),
                  _block([
                    _label('From'),
                    _value('Email: ${identity.email}'),
                    pw.SizedBox(height: 4),
                    _value('GST: ${identity.gst}'),
                  ]),
                ],
              ),
            ],
          ),
          pw.SizedBox(height: 14),
          pw.Table(
            columnWidths: {
              0: const pw.FlexColumnWidth(5),
              1: const pw.FlexColumnWidth(1),
              2: const pw.FlexColumnWidth(1.5),
              3: const pw.FlexColumnWidth(1.8),
            },
            children: [
              pw.TableRow(
                decoration: const pw.BoxDecoration(color: PdfColors.grey100),
                children: [
                  _cell('Service & Description', header: true),
                  _cell('Qty', header: true, align: pw.TextAlign.center),
                  _cell('Rate', header: true, align: pw.TextAlign.center),
                  _cell('Total', header: true, align: pw.TextAlign.right),
                ],
              ),
              for (final item in order.items)
                pw.TableRow(
                  children: [
                    _cell(item.name),
                    _cell('${item.quantity}', align: pw.TextAlign.center),
                    _cell(
                      'Rs.${item.price.round()}',
                      align: pw.TextAlign.center,
                    ),
                    _cell(
                      'Rs.${item.lineTotal.round()}',
                      align: pw.TextAlign.right,
                    ),
                  ],
                ),
            ],
          ),
          pw.SizedBox(height: 16),
          pw.Align(
            alignment: pw.Alignment.centerRight,
            child: pw.SizedBox(
              width: 230,
              child: pw.Column(
                children: [
                  for (final row in summary)
                    pw.Container(
                      decoration: const pw.BoxDecoration(
                        border: pw.Border(
                          bottom: pw.BorderSide(
                            color: PdfColors.grey300,
                            width: 0.2,
                          ),
                        ),
                      ),
                      padding: const pw.EdgeInsets.symmetric(vertical: 4),
                      child: pw.Row(
                        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                        children: [
                          pw.Text(
                            row.label,
                            style: pw.TextStyle(
                              fontSize: 11,
                              fontWeight: pw.FontWeight.bold,
                              color: row.emphasis
                                  ? const PdfColor.fromInt(0xFF452D9B)
                                  : PdfColors.black,
                            ),
                          ),
                          pw.Text(
                            row.value,
                            style: pw.TextStyle(
                              fontSize: 11,
                              fontWeight: pw.FontWeight.bold,
                              color: row.emphasis
                                  ? const PdfColor.fromInt(0xFF452D9B)
                                  : PdfColors.black,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );

    return doc.save();
  }

  static pw.Widget _block(List<pw.Widget> children) => pw.Padding(
    padding: const pw.EdgeInsets.all(8),
    child: pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: children,
    ),
  );

  static pw.Widget _label(String text) => pw.Padding(
    padding: const pw.EdgeInsets.only(bottom: 3),
    child: pw.Text(
      text,
      style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold),
    ),
  );

  static pw.Widget _value(String text) => pw.Padding(
    padding: const pw.EdgeInsets.only(bottom: 1),
    child: pw.Text(text, style: const pw.TextStyle(fontSize: 9)),
  );

  static pw.Widget _small(String text) =>
      pw.Text(text, style: const pw.TextStyle(fontSize: 8));

  static pw.Widget _cell(
    String text, {
    bool header = false,
    pw.TextAlign align = pw.TextAlign.left,
  }) => pw.Padding(
    padding: const pw.EdgeInsets.symmetric(horizontal: 4, vertical: 7),
    child: pw.Text(
      text,
      textAlign: align,
      style: pw.TextStyle(
        fontSize: 10,
        fontWeight: header ? pw.FontWeight.bold : pw.FontWeight.normal,
      ),
    ),
  );
}
