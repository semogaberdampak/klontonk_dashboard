import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../viewmodels/resource_view_model.dart';
import '../theme.dart';

/// Blok tampilan kecil yang dipakai seluruh halaman.

class Loading extends StatelessWidget {
  const Loading({super.key, this.text = 'Memuat data...'});
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.all(48),
        child: Center(
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2.4)),
            const SizedBox(width: 12),
            Text(text, style: const TextStyle(color: AppColors.muted)),
          ]),
        ),
      );
}

class ErrorBox extends StatelessWidget {
  const ErrorBox({super.key, required this.message, this.title = 'Gagal memuat data'});
  final String message;
  final String title;

  @override
  Widget build(BuildContext context) => SectionCard(
        title: title,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(message, style: const TextStyle(color: AppColors.muted)),
          const SizedBox(height: 6),
          const Text('Periksa koneksi internet, lalu tekan "Muat ulang" di kanan atas.', style: TextStyle(fontSize: 12, color: AppColors.muted)),
        ]),
      );
}

/// Tampilkan Loading / ErrorBox sesuai status, atau isi halaman bila data siap.
Widget resourceBody<T>(ResourceViewModel<T> vm, Widget Function(T data) builder) {
  switch (vm.status) {
    case ResourceStatus.loading:
      return const Loading();
    case ResourceStatus.error:
      return ErrorBox(message: vm.message);
    case ResourceStatus.ready:
      final data = vm.data;
      return data == null ? const Loading() : builder(data);
  }
}

class SectionCard extends StatelessWidget {
  const SectionCard({super.key, this.title, this.hint, required this.child});
  final String? title;
  final String? hint;
  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (title != null) ...[
            Text(title!, style: Theme.of(context).textTheme.titleMedium),
            if (hint != null) Padding(padding: const EdgeInsets.only(top: 2), child: Text(hint!, style: Theme.of(context).textTheme.bodySmall)),
            const SizedBox(height: 12),
          ],
          child,
        ]),
      );
}

enum StatTone { none, warning, danger, success }

class StatCard extends StatelessWidget {
  const StatCard({super.key, required this.label, required this.value, this.note, this.tone = StatTone.none});
  final String label;
  final String value;
  final String? note;
  final StatTone tone;

  @override
  Widget build(BuildContext context) {
    final (bg, border) = switch (tone) {
      StatTone.warning => (const Color(0xFFFCF3E0), const Color(0xFFF0D9AF)),
      StatTone.danger => (const Color(0xFFFCE9E9), const Color(0xFFF3C6C6)),
      StatTone.success => (const Color(0xFFE8F6EE), const Color(0xFFBFE3CC)),
      StatTone.none => (AppColors.surface, AppColors.border),
    };
    return Container(
      width: 190,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(12), border: Border.all(color: border)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label.toUpperCase(), style: const TextStyle(fontSize: 11, letterSpacing: 0.6, color: AppColors.muted)),
        const SizedBox(height: 6),
        FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700))),
        if (note != null) Padding(padding: const EdgeInsets.only(top: 3), child: Text(note!, style: const TextStyle(fontSize: 12, color: AppColors.muted))),
      ]),
    );
  }
}

class StatGrid extends StatelessWidget {
  const StatGrid({super.key, required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(bottom: 16), child: Wrap(spacing: 12, runSpacing: 12, children: children));
}

class StatusBadge extends StatelessWidget {
  const StatusBadge(this.text, {super.key, this.tone = Tone.none});
  final String text;
  final Tone tone;

  @override
  Widget build(BuildContext context) {
    final colors = toneColors(tone);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
      decoration: BoxDecoration(color: colors.background, borderRadius: BorderRadius.circular(99)),
      child: Text(text, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: colors.foreground)),
    );
  }
}

/// Nama (opsional tebal) dengan keterangan kecil di bawahnya: sel tabel yang paling sering dipakai.
class CellStack extends StatelessWidget {
  const CellStack({super.key, required this.main, this.sub, this.strong = false});
  final String main;
  final String? sub;
  final bool strong;

  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
        Text(main, style: TextStyle(fontWeight: strong ? FontWeight.w700 : FontWeight.w400)),
        if (sub != null && sub!.isNotEmpty) Text(sub!, style: const TextStyle(fontSize: 11.5, color: AppColors.muted)),
      ]);
}

class Mono extends StatelessWidget {
  const Mono(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) => Text(text, style: const TextStyle(fontFamily: 'monospace', fontSize: 12.5));
}

/// Teks yang dipotong dengan lebar maksimum (kolom rincian log).
class DetailText extends StatelessWidget {
  const DetailText(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) => ConstrainedBox(constraints: const BoxConstraints(maxWidth: 360), child: Text(text, style: const TextStyle(fontSize: 12.5, color: AppColors.muted)));
}

class RowButton {
  const RowButton(this.label, this.onTap, {this.tooltip});
  final String label;
  final VoidCallback onTap;
  final String? tooltip;
}

/// Baris tombol aksi di kolom kanan tabel. Entri null dilewati (untuk tombol bersyarat).
class RowActions extends StatelessWidget {
  const RowActions(this.buttons, {super.key});
  final List<RowButton?> buttons;

  @override
  Widget build(BuildContext context) => Wrap(
        spacing: 2,
        children: [
          for (final b in buttons.whereType<RowButton>())
            Tooltip(
              message: b.tooltip ?? b.label,
              child: TextButton(onPressed: b.onTap, style: TextButton.styleFrom(visualDensity: VisualDensity.compact, foregroundColor: AppColors.muted), child: Text(b.label)),
            ),
        ],
      );
}

class TableColumn<T> {
  const TableColumn(this.label, this.cell, {this.numeric = false});
  final String label;
  final Widget Function(T row) cell;
  final bool numeric;
}

/// Tabel data yang bisa digulir mendatar. Nilai dari database dirender sebagai teks (aman dari injeksi).
class AppDataTable<T> extends StatelessWidget {
  const AppDataTable({super.key, required this.columns, required this.rows, this.empty = 'Belum ada data.'});
  final List<TableColumn<T>> columns;
  final List<T> rows;
  final String empty;

  @override
  Widget build(BuildContext context) {
    if (rows.isEmpty) {
      return Padding(padding: const EdgeInsets.symmetric(vertical: 28), child: Center(child: Text(empty, style: const TextStyle(color: AppColors.muted))));
    }
    return LayoutBuilder(
      builder: (context, box) => SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: ConstrainedBox(
          constraints: BoxConstraints(minWidth: box.maxWidth),
          child: DataTable(
            headingRowHeight: 40,
            dataRowMinHeight: 46,
            dataRowMaxHeight: 78,
            columnSpacing: 22,
            horizontalMargin: 12,
            headingTextStyle: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: AppColors.muted, letterSpacing: 0.5),
            columns: [for (final c in columns) DataColumn(label: Text(c.label.toUpperCase()), numeric: c.numeric)],
            rows: [
              for (final row in rows)
                DataRow(cells: [for (final c in columns) DataCell(c.cell(row))]),
            ],
          ),
        ),
      ),
    );
  }
}

class PagerBar extends StatelessWidget {
  const PagerBar({super.key, required this.total, required this.limit, required this.offset, required this.onGo});
  final int total;
  final int limit;
  final int offset;
  final void Function(int offset) onGo;

  @override
  Widget build(BuildContext context) {
    final dari = total == 0 ? 0 : offset + 1;
    final sampai = (offset + limit) > total ? total : offset + limit;
    final halaman = offset ~/ limit + 1;
    final totalHalaman = total == 0 ? 1 : (total / limit).ceil();
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Wrap(alignment: WrapAlignment.spaceBetween, crossAxisAlignment: WrapCrossAlignment.center, runSpacing: 6, children: [
        Text('Menampilkan ${formatNumber(dari)}-${formatNumber(sampai)} dari ${formatNumber(total)} baris', style: const TextStyle(fontSize: 12.5, color: AppColors.muted)),
        Row(mainAxisSize: MainAxisSize.min, children: [
          OutlinedButton(onPressed: offset <= 0 ? null : () => onGo((offset - limit).clamp(0, 1 << 30)), child: const Text('Sebelumnya')),
          Padding(padding: const EdgeInsets.symmetric(horizontal: 10), child: Text('Halaman $halaman / $totalHalaman', style: const TextStyle(fontSize: 12.5, color: AppColors.muted))),
          OutlinedButton(onPressed: sampai >= total ? null : () => onGo(offset + limit), child: const Text('Berikutnya')),
        ]),
      ]),
    );
  }
}
