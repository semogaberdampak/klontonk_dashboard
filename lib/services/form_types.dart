import '../data/models/models.dart';

enum FieldType { text, number, email, password, date, textarea, select, checkbox }

class FormFieldSpec {
  const FormFieldSpec({
    required this.name,
    required this.label,
    this.type = FieldType.text,
    this.required = false,
    this.placeholder,
    this.hint,
    this.options = const [],
    this.maxLength,
    this.half = false,
  });

  final String name;
  final String label;
  final FieldType type;
  final bool required;
  final String? placeholder;
  final String? hint;
  final List<Option> options;
  final int? maxLength;

  /// Dua field `half` yang berurutan ditampilkan sebaris.
  final bool half;
}

typedef FormValues = Map<String, Object>;

sealed class SubmitResult {
  const SubmitResult();
}

final class SubmitOk extends SubmitResult {
  const SubmitOk();
}

final class SubmitFail extends SubmitResult {
  const SubmitFail(this.error);
  final String error;
}

class FormSpec {
  const FormSpec({required this.title, required this.fields, this.values = const {}, this.submitText = 'Simpan', this.wide = false, this.note, required this.onSubmit});

  final String title;
  final List<FormFieldSpec> fields;
  final Map<String, Object?> values;
  final String submitText;
  final bool wide;
  final String? note;

  /// Dialog hanya tertutup bila berhasil, sehingga pengguna bisa memperbaiki isian.
  final Future<SubmitResult> Function(FormValues values) onSubmit;
}
