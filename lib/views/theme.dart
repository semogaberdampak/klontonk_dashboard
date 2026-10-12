import 'package:flutter/material.dart';

import '../core/format.dart';

/// Palet dan tema dashboard (sama dengan versi web sebelumnya: sidebar gelap, latar krem).
class AppColors {
  const AppColors._();

  static const bg = Color(0xFFF7F5F2);
  static const surface = Colors.white;
  static const border = Color(0xFFE6E2DB);
  static const text = Color(0xFF1B2433);
  static const muted = Color(0xFF6B7280);
  static const primary = Color(0xFF1D4ED8);
  static const sidebar = Color(0xFF0F172A);
  static const sidebarMuted = Color(0xFF7C8AA0);
  static const danger = Color(0xFFB91C1C);
}

class ToneColors {
  const ToneColors(this.background, this.foreground);
  final Color background;
  final Color foreground;
}

ToneColors toneColors(Tone tone) => switch (tone) {
      Tone.ok => const ToneColors(Color(0xFFE6F6EC), Color(0xFF15803D)),
      Tone.warn => const ToneColors(Color(0xFFFDF1DC), Color(0xFFB45309)),
      Tone.bad => const ToneColors(Color(0xFFFDE7E7), Color(0xFFB91C1C)),
      Tone.info => const ToneColors(Color(0xFFE6EEFD), Color(0xFF1D4ED8)),
      Tone.none => const ToneColors(Color(0xFFF1EFEA), Color(0xFF4B5563)),
    };

ThemeData buildTheme() {
  final base = ColorScheme.fromSeed(seedColor: AppColors.primary, brightness: Brightness.light);
  return ThemeData(
    useMaterial3: true,
    colorScheme: base.copyWith(primary: AppColors.primary, surface: AppColors.surface),
    scaffoldBackgroundColor: AppColors.bg,
    fontFamily: 'Roboto',
    dividerColor: AppColors.border,
    textTheme: const TextTheme(
      bodyMedium: TextStyle(fontSize: 13.5, color: AppColors.text),
      bodySmall: TextStyle(fontSize: 12, color: AppColors.muted),
      titleMedium: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.text),
      headlineSmall: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.text),
    ),
    inputDecorationTheme: InputDecorationTheme(
      isDense: true,
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: AppColors.border)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: AppColors.border)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: AppColors.primary, width: 1.5)),
    ),
    filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)), minimumSize: const Size(0, 40))),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)), side: const BorderSide(color: AppColors.border), minimumSize: const Size(0, 40)),
    ),
    dialogTheme: DialogThemeData(backgroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
  );
}
