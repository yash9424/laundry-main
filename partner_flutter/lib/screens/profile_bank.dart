import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/api.dart';
import '../services/store.dart';
import '../theme/brand.dart';
import '../widgets/common.dart';
import 'profile_personal.dart' show UpperCaseTextFormatter;

/// `app/profile/bank/page.tsx` -- where the captain's payouts go.
///
/// Same shape as the personal screen: read-only until Edit, then Save writes
/// the whole `bankDetails` object back in one PATCH.
class ProfileBankScreen extends StatefulWidget {
  const ProfileBankScreen({super.key});

  @override
  State<ProfileBankScreen> createState() => _ProfileBankScreenState();
}

class _ProfileBankScreenState extends State<ProfileBankScreen> {
  final _holder = TextEditingController();
  final _account = TextEditingController();
  final _ifsc = TextEditingController();
  final _bank = TextEditingController();
  final _branch = TextEditingController();

  bool _loading = true;
  bool _editing = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _holder.dispose();
    _account.dispose();
    _ifsc.dispose();
    _bank.dispose();
    _branch.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final partnerId = Store.partnerId;
    if (partnerId == null) {
      if (mounted) {
        Navigator.of(context).pushNamedAndRemoveUntil('/login', (r) => false);
      }
      return;
    }

    final result = await Api.partner(partnerId);
    if (!mounted) return;
    if (result.ok) {
      final bank = result.map['bankDetails'] is Map
          ? Map<String, dynamic>.from(result.map['bankDetails'] as Map)
          : const {};
      _holder.text = (bank['accountHolderName'] ?? '').toString();
      _account.text = (bank['accountNumber'] ?? '').toString();
      _ifsc.text = (bank['ifscCode'] ?? '').toString();
      _bank.text = (bank['bankName'] ?? '').toString();
      _branch.text = (bank['branch'] ?? '').toString();
    }
    setState(() => _loading = false);
  }

  Future<void> _save() async {
    final partnerId = Store.partnerId;
    if (partnerId == null) return;

    setState(() => _saving = true);
    final result = await Api.updatePartner(partnerId, {
      'bankDetails': {
        'accountHolderName': _holder.text.trim(),
        'accountNumber': _account.text.trim(),
        'ifscCode': _ifsc.text.trim(),
        'bankName': _bank.text.trim(),
        'branch': _branch.text.trim(),
      },
    });

    if (!mounted) return;
    setState(() => _saving = false);

    if (!result.ok) {
      showToast(context, 'Failed to update bank details',
          kind: ToastKind.error);
      return;
    }
    showToast(context, 'Bank details updated successfully!',
        kind: ToastKind.success);
    setState(() => _editing = false);
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: Brand.gray50,
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                height: 48,
                width: 48,
                child: CircularProgressIndicator(
                    strokeWidth: 4, color: Color(0xFFE0D4F7)),
              ),
              SizedBox(height: 16),
              Text('Loading...', style: TextStyle(color: Brand.gray500)),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Brand.gray50,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            InkWell(
              onTap: () => Navigator.of(context).maybePop(),
              child: const Padding(
                padding: EdgeInsets.only(bottom: 16),
                child: Row(
                  children: [
                    Icon(Icons.chevron_left, size: 24, color: Brand.gray600),
                    SizedBox(width: 8),
                    Text('Back',
                        style: TextStyle(
                            fontWeight: FontWeight.w600, color: Brand.gray600)),
                  ],
                ),
              ),
            ),
            Container(
              decoration: BoxDecoration(
                color: Brand.surface,
                borderRadius: BorderRadius.circular(Brand.rLg),
                boxShadow: const [
                  BoxShadow(
                      color: Color(0x14000000),
                      blurRadius: 8,
                      offset: Offset(0, 2)),
                ],
              ),
              clipBehavior: Clip.antiAlias,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: const BoxDecoration(
                      border: Border(bottom: BorderSide(color: Brand.gray200)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Bank Details',
                          style: TextStyle(
                            fontFamily: Brand.heading,
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            color: Brand.gray900,
                          ),
                        ),
                        Material(
                          color: Colors.transparent,
                          borderRadius: BorderRadius.circular(Brand.rLg),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(Brand.rLg),
                            onTap: _saving
                                ? null
                                : () => _editing
                                    ? _save()
                                    : setState(() => _editing = true),
                            child: Ink(
                              decoration: BoxDecoration(
                                gradient: _saving ? null : Brand.gradient,
                                color: _saving ? Brand.gray400 : null,
                                borderRadius: BorderRadius.circular(Brand.rLg),
                              ),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 16, vertical: 8),
                                child: Text(
                                  _saving
                                      ? 'Saving...'
                                      : (_editing ? 'Save' : 'Edit'),
                                  style: const TextStyle(
                                    fontFamily: Brand.heading,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        _entry('Account Holder Name', _holder),
                        _entry('Account Number', _account,
                            keyboardType: TextInputType.number,
                            formatters: [
                              FilteringTextInputFormatter.digitsOnly
                            ]),
                        _entry('IFSC Code', _ifsc,
                            formatters: [UpperCaseTextFormatter()]),
                        _entry('Bank Name', _bank),
                        _entry('Branch', _branch),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _entry(
    String label,
    TextEditingController controller, {
    TextInputType? keyboardType,
    List<TextInputFormatter>? formatters,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Color(0xFF1F2937),
            ),
          ),
          const SizedBox(height: 4),
          if (_editing)
            TextField(
              controller: controller,
              keyboardType: keyboardType,
              inputFormatters: formatters,
              style: const TextStyle(fontSize: 16, color: Brand.gray900),
              decoration: InputDecoration(
                isDense: false,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(Brand.rLg),
                  borderSide: const BorderSide(color: Brand.gray300),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(Brand.rLg),
                  borderSide: const BorderSide(color: Brand.purple, width: 2),
                ),
              ),
            )
          else
            Text(
              controller.text.trim().isEmpty ? 'N/A' : controller.text,
              style: const TextStyle(fontSize: 16, color: Brand.gray900),
            ),
        ],
      ),
    );
  }
}
