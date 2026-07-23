import 'package:flutter/material.dart';

/// Central place for the visual language shared with the Lovable web dashboard.
/// The dashboard uses a purple -> blue gradient for its sidebar; we mirror it
/// here so the child app feels like part of the same product.
class AppColors {
  static const Color gradientStart = Color(0xFF6D28D9); // violet-700
  static const Color gradientEnd = Color(0xFF2563EB); // blue-600
  static const Color background = Color(0xFFF7F8FC);
  static const Color card = Colors.white;
  static const Color textPrimary = Color(0xFF1F2333);
  static const Color textSecondary = Color(0xFF6B7280);
  static const Color success = Color(0xFF16A34A);
  static const Color warning = Color(0xFFF59E0B);
  static const Color danger = Color(0xFFDC2626);

  static const LinearGradient sidebarGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [gradientStart, gradientEnd],
  );
}

class AppTheme {
  static ThemeData light() {
    final base = ThemeData.light(useMaterial3: true);
    return base.copyWith(
      scaffoldBackgroundColor: AppColors.background,
      colorScheme: base.colorScheme.copyWith(
        primary: AppColors.gradientStart,
        secondary: AppColors.gradientEnd,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        color: AppColors.card,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: Colors.grey.shade200),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.gradientStart,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
      textTheme: base.textTheme.apply(
        bodyColor: AppColors.textPrimary,
        displayColor: AppColors.textPrimary,
      ),
    );
  }
}

/// Backend configuration. Point this at your Lovable Cloud project URL.
class ApiConfig {
  static const bool useLocalHost = false; // Toggle this for local testing

  static const String baseUrl = useLocalHost 
    ? 'http://10.0.2.2:3000'
    : String.fromEnvironment(
        'LOVABLE_BASE_URL',
        defaultValue: 'https://ais-dev-ruqulu6ovx5bhtijsiqgk3-227329294413.asia-southeast1.run.app',
      );

  static const String ingestPath = '/api/public/ingest';
  static const String childMePath = '/api/public/child/me';
  static const String ackPath = '/api/public/child/ack';

  /// Polling interval for rules and lock status.
  static const int statusPollIntervalSeconds = 10;
  
  /// Ingestion interval for telemetry.
  static const int telemetryIntervalSeconds = 30;
}
