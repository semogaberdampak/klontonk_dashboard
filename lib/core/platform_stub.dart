/// Platform non-web: fungsi khusus browser belum tersedia.
void downloadText(String filename, String content, String mimeType) => throw UnsupportedError('Unduh berkas hanya didukung pada versi web.');

Future<bool> clearAppCache() async => false;

void reloadPage() {}
