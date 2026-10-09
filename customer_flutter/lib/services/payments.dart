import 'dart:async';

import 'package:razorpay_flutter/razorpay_flutter.dart';

import 'api.dart';
import 'store.dart';

/// How a payment attempt ended.
enum PaymentOutcome { paid, cancelled, failed }

class PaymentResult {
  const PaymentResult(
    this.outcome, {
    this.orderId,
    this.paymentId,
    this.signature,
    this.message,
  });

  final PaymentOutcome outcome;
  final String? orderId;
  final String? paymentId;
  final String? signature;
  final String? message;

  bool get paid => outcome == PaymentOutcome.paid;
  bool get cancelled => outcome == PaymentOutcome.cancelled;
}

/// Razorpay checkout, as one call that returns when the sheet closes.
///
/// The web app loaded checkout.js and passed a handler callback; the native SDK
/// is event based, so the events are funnelled into a single Future here and
/// the screens stay linear. The signature is verified server-side through
/// /api/razorpay/verify-payment before anything is treated as paid, exactly as
/// before.
class Payments {
  Payments._();

  static Future<PaymentResult> charge({
    required num amount,
    required String description,
    String? receipt,
    String? contact,
    String? email,
  }) async {
    // Step 1: the server creates the Razorpay order and hands back its key id.
    final created = await Api.razorpayCreateOrder(amount: amount, receipt: receipt);
    if (!created.ok) {
      return PaymentResult(
        PaymentOutcome.failed,
        message: created.error ?? 'Could not start payment. Try again.',
      );
    }

    final body = created.raw ?? const {};
    final keyId = body['keyId']?.toString();
    final rzpOrderId = body['orderId']?.toString();
    final rzpAmount = body['amount'];
    final currency = body['currency']?.toString() ?? 'INR';

    if (keyId == null || keyId.isEmpty || rzpOrderId == null || rzpOrderId.isEmpty) {
      return const PaymentResult(
        PaymentOutcome.failed,
        message: 'Could not start payment. Try again.',
      );
    }

    // Step 2: the native sheet.
    final razorpay = Razorpay();
    final completer = Completer<PaymentResult>();

    void finish(PaymentResult result) {
      if (!completer.isCompleted) completer.complete(result);
    }

    razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, (PaymentSuccessResponse r) {
      finish(PaymentResult(
        PaymentOutcome.paid,
        orderId: r.orderId ?? rzpOrderId,
        paymentId: r.paymentId,
        signature: r.signature,
      ));
    });

    razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, (PaymentFailureResponse r) {
      // Razorpay reports a dismissed sheet as an error too; treating that as a
      // failure would show people a scary message for simply backing out.
      final cancelled = r.code == Razorpay.PAYMENT_CANCELLED;
      finish(PaymentResult(
        cancelled ? PaymentOutcome.cancelled : PaymentOutcome.failed,
        message: cancelled ? null : (r.message ?? 'Payment failed.'),
      ));
    });

    razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, (ExternalWalletResponse r) {
      finish(const PaymentResult(PaymentOutcome.cancelled));
    });

    try {
      razorpay.open({
        'key': keyId,
        'amount': rzpAmount,
        'currency': currency,
        'name': 'Urban Steam',
        'description': description,
        'order_id': rzpOrderId,
        'theme': {'color': '#452D9B'},
        'prefill': {
          'name': Store.userName,
          if ((contact ?? '').isNotEmpty) 'contact': contact,
          if ((email ?? '').isNotEmpty) 'email': email,
        },
      });
    } catch (_) {
      finish(const PaymentResult(
        PaymentOutcome.failed,
        message: 'Could not start payment. Try again.',
      ));
    }

    final result = await completer.future;
    razorpay.clear();

    if (!result.paid) return result;

    // Step 3: only the server may decide a payment is genuine.
    final verified = await Api.razorpayVerify(
      orderId: result.orderId ?? rzpOrderId,
      paymentId: result.paymentId ?? '',
      signature: result.signature ?? '',
    );
    if (!verified.ok) {
      return PaymentResult(
        PaymentOutcome.failed,
        orderId: result.orderId,
        paymentId: result.paymentId,
        message: verified.error ?? 'We could not verify that payment.',
      );
    }

    return PaymentResult(
      PaymentOutcome.paid,
      orderId: result.orderId ?? rzpOrderId,
      paymentId: result.paymentId,
    );
  }
}
