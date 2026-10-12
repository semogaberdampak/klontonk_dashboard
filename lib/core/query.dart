/// Penyiapan masukan untuk filter PostgREST dan parameter URL.

/// Karakter yang bisa merusak sintaks filter PostgREST dibuang dari kata kunci pencarian.
String bersihkanKataKunci(String? teks) => (teks ?? '').replaceAll(RegExp(r'[(),*%\\]'), ' ').trim();

/// Offset paginasi dari parameter URL: tidak pernah negatif atau NaN.
int parseOffset(String? value) {
  final n = int.tryParse(value ?? '');
  return (n == null || n < 0) ? 0 : n;
}

/// Ambil nilai hanya bila termasuk daftar yang diizinkan; selain itu string kosong.
String oneOf(String? value, List<String> allowed) => allowed.contains(value) ? value! : '';
