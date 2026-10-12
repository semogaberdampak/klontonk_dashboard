import 'dart:js_interop';

import 'package:web/web.dart' as web;

/// Unduh teks sebagai berkas lewat Blob + tautan sementara.
void downloadText(String filename, String content, String mimeType) {
  final blob = web.Blob([content.toJS].toJS, web.BlobPropertyBag(type: mimeType));
  final url = web.URL.createObjectURL(blob);
  final anchor = web.HTMLAnchorElement()
    ..href = url
    ..download = filename;
  web.document.body?.append(anchor);
  anchor.click();
  anchor.remove();
  web.URL.revokeObjectURL(url);
}

/// Bersihkan cache aplikasi: batalkan service worker dan hapus semua Cache Storage.
Future<bool> clearAppCache() async {
  try {
    final registrations = (await web.window.navigator.serviceWorker.getRegistrations().toDart).toDart;
    for (final registration in registrations) {
      await registration.unregister().toDart;
    }
    final keys = (await web.window.caches.keys().toDart).toDart;
    for (final key in keys) {
      await web.window.caches.delete(key.toDart).toDart;
    }
    return true;
  } catch (_) {
    return false;
  }
}

void reloadPage() => web.window.location.reload();
