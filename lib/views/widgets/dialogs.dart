import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../data/models/models.dart';
import '../../services/form_types.dart';
import '../theme.dart';

/// Dialog konfirmasi / pemberitahuan. Tanpa [cancelText] hanya ada satu tombol.
Future<bool> showConfirmDialog(BuildContext context, {required String title, required String message, required String confirmText, String? cancelText, bool danger = false}) async {
  final hasil = await showDialog<bool>(
    context: context,
    barrierDismissible: true,
    builder: (context) => AlertDialog(
      title: Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
      content: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 460), child: SingleChildScrollView(child: SelectableText(message, style: const TextStyle(fontSize: 13.5, color: AppColors.muted)))),
      actions: [
        if (cancelText != null) OutlinedButton(onPressed: () => Navigator.pop(context, false), child: Text(cancelText)),
        FilledButton(
          onPressed: () => Navigator.pop(context, true),
          style: danger ? FilledButton.styleFrom(backgroundColor: AppColors.danger) : null,
          child: Text(confirmText),
        ),
      ],
    ),
  );
  // Menutup lewat latar/Escape: pemberitahuan (tanpa tombol batal) dianggap "OK".
  return hasil ?? (cancelText == null);
}

Future<bool> showFormDialog(BuildContext context, FormSpec spec) async {
  final hasil = await showDialog<bool>(context: context, barrierDismissible: false, builder: (context) => _FormDialog(spec: spec));
  return hasil ?? false;
}

class _FormDialog extends StatefulWidget {
  const _FormDialog({required this.spec});
  final FormSpec spec;

  @override
  State<_FormDialog> createState() => _FormDialogState();
}

class _FormDialogState extends State<_FormDialog> {
  final _controllers = <String, TextEditingController>{};
  final _selects = <String, String>{};
  final _checks = <String, bool>{};
  String? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    for (final f in widget.spec.fields) {
      final nilai = widget.spec.values[f.name];
      switch (f.type) {
        case FieldType.checkbox:
          _checks[f.name] = nilai == true;
        case FieldType.select:
          final awal = nilai?.toString() ?? '';
          _selects[f.name] = f.options.any((o) => o.value == awal) ? awal : (f.options.isEmpty ? '' : f.options.first.value);
        default:
          _controllers[f.name] = TextEditingController(text: nilai?.toString() ?? '');
      }
    }
  }

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _error = null);
    final values = <String, Object>{};
    for (final f in widget.spec.fields) {
      switch (f.type) {
        case FieldType.checkbox:
          values[f.name] = _checks[f.name] ?? false;
        case FieldType.select:
          values[f.name] = _selects[f.name] ?? '';
        default:
          values[f.name] = _controllers[f.name]!.text.trim();
      }
    }
    for (final f in widget.spec.fields) {
      if (f.required && f.type != FieldType.checkbox && (values[f.name] as String).isEmpty) {
        setState(() => _error = '${f.label} wajib diisi.');
        return;
      }
    }

    setState(() => _busy = true);
    try {
      final hasil = await widget.spec.onSubmit(values);
      if (!mounted) return;
      switch (hasil) {
        case SubmitOk():
          Navigator.pop(context, true);
        case SubmitFail(:final error):
          setState(() => _error = error.isEmpty ? 'Gagal menyimpan. Coba lagi.' : error);
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'Terjadi kesalahan. Coba lagi.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _field(FormFieldSpec f) {
    switch (f.type) {
      case FieldType.checkbox:
        return CheckboxListTile(
          contentPadding: EdgeInsets.zero,
          controlAffinity: ListTileControlAffinity.leading,
          title: Text(f.label, style: const TextStyle(fontSize: 13)),
          subtitle: f.hint == null ? null : Text(f.hint!),
          value: _checks[f.name],
          onChanged: (v) => setState(() => _checks[f.name] = v ?? false),
        );
      case FieldType.select:
        return DropdownButtonFormField<String>(
          initialValue: _selects[f.name],
          isExpanded: true,
          decoration: InputDecoration(labelText: '${f.label}${f.required ? ' *' : ''}', helperText: f.hint, helperMaxLines: 3),
          items: [for (final Option o in f.options) DropdownMenuItem(value: o.value, child: Text(o.label, overflow: TextOverflow.ellipsis))],
          onChanged: (v) => setState(() => _selects[f.name] = v ?? ''),
        );
      case FieldType.date:
        final controller = _controllers[f.name]!;
        return TextField(
          controller: controller,
          readOnly: true,
          decoration: InputDecoration(labelText: '${f.label}${f.required ? ' *' : ''}', suffixIcon: const Icon(Icons.calendar_today_outlined, size: 18), helperText: f.hint),
          onTap: () async {
            final awal = DateTime.tryParse(controller.text) ?? DateTime.now();
            final dipilih = await showDatePicker(context: context, initialDate: awal, firstDate: DateTime(2020), lastDate: DateTime(2100));
            if (dipilih != null) {
              controller.text = '${dipilih.year.toString().padLeft(4, '0')}-${dipilih.month.toString().padLeft(2, '0')}-${dipilih.day.toString().padLeft(2, '0')}';
            }
          },
        );
      default:
        return TextField(
          controller: _controllers[f.name],
          obscureText: f.type == FieldType.password,
          maxLength: f.maxLength,
          maxLines: f.type == FieldType.textarea ? 3 : 1,
          keyboardType: switch (f.type) { FieldType.number => TextInputType.number, FieldType.email => TextInputType.emailAddress, _ => TextInputType.text },
          inputFormatters: f.type == FieldType.number ? [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))] : null,
          decoration: InputDecoration(labelText: '${f.label}${f.required ? ' *' : ''}', hintText: f.placeholder, helperText: f.hint, helperMaxLines: 3, counterText: ''),
        );
    }
  }

  List<Widget> _rows() {
    final baris = <Widget>[];
    final fields = widget.spec.fields;
    for (var i = 0; i < fields.length; i++) {
      final f = fields[i];
      final next = i + 1 < fields.length ? fields[i + 1] : null;
      if (f.half && next != null && next.half) {
        baris.add(Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(child: _field(f)), const SizedBox(width: 12), Expanded(child: _field(next))]));
        i++;
      } else {
        baris.add(_field(f));
      }
      baris.add(const SizedBox(height: 12));
    }
    return baris;
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
        title: Text(widget.spec.title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
        content: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: widget.spec.wide ? 640 : 440),
          child: SingleChildScrollView(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
              if (widget.spec.note != null) Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(widget.spec.note!, style: const TextStyle(fontSize: 12.5, color: AppColors.muted))),
              const SizedBox(height: 4),
              ..._rows(),
              if (_error != null)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: const Color(0xFFFDE7E7), borderRadius: BorderRadius.circular(8)),
                  child: Text(_error!, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
                ),
            ]),
          ),
        ),
        actions: [
          OutlinedButton(onPressed: _busy ? null : () => Navigator.pop(context, false), child: const Text('Batal')),
          FilledButton(onPressed: _busy ? null : _submit, child: Text(_busy ? 'Menyimpan...' : widget.spec.submitText)),
        ],
      );
}
