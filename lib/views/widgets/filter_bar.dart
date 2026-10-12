import 'package:flutter/material.dart';

import '../../data/models/models.dart';
import '../theme.dart';

enum FilterKind { text, select, date }

/// Satu isian pada bar filter. [onChanged] (opsional) dipanggil saat nilai berubah; dipakai untuk
/// filter "client" yang langsung berpindah halaman dan menyesuaikan daftar cabang.
class FilterFieldSpec {
  const FilterFieldSpec({required this.name, required this.label, this.kind = FilterKind.text, this.options = const [], this.placeholder, this.grow = false, this.onChanged});

  final String name;
  final String label;
  final FilterKind kind;
  final List<Option> options;
  final String? placeholder;
  final bool grow;
  final void Function(String value, Map<String, String> draft)? onChanged;
}

/// Bar filter berbasis draft: ketikan pengguna tidak mengubah URL sebelum tombol "Terapkan" ditekan.
/// Dibuat ulang (state baru) setiap kali URL berubah karena halaman membuat ViewModel baru.
class FilterBarForm extends StatefulWidget {
  const FilterBarForm({super.key, required this.fields, required this.initial, required this.onApply, this.onClear, this.trailing = const []});

  final List<FilterFieldSpec> fields;
  final Map<String, String> initial;
  final void Function(Map<String, String> draft) onApply;
  final VoidCallback? onClear;
  final List<Widget> trailing;

  @override
  State<FilterBarForm> createState() => _FilterBarFormState();
}

class _FilterBarFormState extends State<FilterBarForm> {
  late final Map<String, String> _draft = Map.of(widget.initial);
  final _controllers = <String, TextEditingController>{};

  @override
  void initState() {
    super.initState();
    for (final f in widget.fields) {
      if (f.kind != FilterKind.select) _controllers[f.name] = TextEditingController(text: _draft[f.name] ?? '');
    }
  }

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  void _set(FilterFieldSpec f, String value) {
    _draft[f.name] = value;
    f.onChanged?.call(value, Map.of(_draft));
  }

  Widget _input(FilterFieldSpec f) {
    final lebar = f.grow ? 260.0 : 180.0;
    switch (f.kind) {
      case FilterKind.select:
        final nilai = f.options.any((o) => o.value == _draft[f.name]) ? _draft[f.name] : (f.options.isEmpty ? null : f.options.first.value);
        return SizedBox(
          width: lebar,
          child: DropdownButtonFormField<String>(
            initialValue: nilai,
            isExpanded: true,
            decoration: InputDecoration(labelText: f.label),
            items: [for (final o in f.options) DropdownMenuItem(value: o.value, child: Text(o.label, overflow: TextOverflow.ellipsis))],
            onChanged: (v) => setState(() => _set(f, v ?? '')),
          ),
        );
      case FilterKind.date:
        final controller = _controllers[f.name]!;
        return SizedBox(
          width: 160,
          child: TextField(
            controller: controller,
            readOnly: true,
            decoration: InputDecoration(
              labelText: f.label,
              suffixIcon: controller.text.isEmpty
                  ? const Icon(Icons.calendar_today_outlined, size: 16)
                  : IconButton(icon: const Icon(Icons.close, size: 16), onPressed: () => setState(() {
                        controller.clear();
                        _set(f, '');
                      })),
            ),
            onTap: () async {
              final awal = DateTime.tryParse(controller.text) ?? DateTime.now();
              final dipilih = await showDatePicker(context: context, initialDate: awal, firstDate: DateTime(2020), lastDate: DateTime(2100));
              if (dipilih != null) {
                final teks = '${dipilih.year.toString().padLeft(4, '0')}-${dipilih.month.toString().padLeft(2, '0')}-${dipilih.day.toString().padLeft(2, '0')}';
                setState(() {
                  controller.text = teks;
                  _set(f, teks);
                });
              }
            },
          ),
        );
      case FilterKind.text:
        return SizedBox(
          width: lebar,
          child: TextField(
            controller: _controllers[f.name],
            decoration: InputDecoration(labelText: f.label, hintText: f.placeholder),
            onChanged: (v) => _set(f, v),
            onSubmitted: (_) => widget.onApply(Map.of(_draft)),
          ),
        );
    }
  }

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
        child: Wrap(spacing: 12, runSpacing: 12, crossAxisAlignment: WrapCrossAlignment.center, children: [
          for (final f in widget.fields) _input(f),
          FilledButton(onPressed: () => widget.onApply(Map.of(_draft)), child: const Text('Terapkan')),
          if (widget.onClear != null) OutlinedButton(onPressed: widget.onClear, child: const Text('Bersihkan')),
          ...widget.trailing,
        ]),
      );
}
