import 'package:usage_stats/usage_stats.dart';
import '../models/device_status.dart';

/// Reads Android's UsageStatsManager data (requires the special "Usage
/// Access" system permission, granted from Settings — see
/// `openUsageAccessSettings`). There is no equivalent public iOS API, so on
/// iOS this service returns empty results and the Reports tab shows a note
/// explaining that screen-time data is Android-only for now (Apple's
/// Screen Time / Family Controls APIs require a separate, Apple-approved
/// entitlement and integration path).
class UsageService {
  Future<bool> hasPermission() async {
    try {
      final granted = await UsageStats.checkUsagePermission();
      return granted ?? false;
    } catch (_) {
      return false;
    }
  }

  /// Opens the system "Usage Access" settings screen so the child (or
  /// parent, during setup) can grant it manually.
  Future<void> openUsageAccessSettings() async {
    await UsageStats.grantUsagePermission();
  }

  /// Returns per-app usage for the given window, plus the summed total
  /// (screen time) for that window.
  Future<List<AppUsageEvent>> queryUsage({
    required DateTime start,
    required DateTime end,
  }) async {
    final hasPerm = await hasPermission();
    if (!hasPerm) return [];

    final stats = await UsageStats.queryUsageStats(start, end);
    return stats
        .where((s) => (int.tryParse(s.totalTimeInForeground ?? '0') ?? 0) > 0)
        .map((s) {
      final seconds = (int.tryParse(s.totalTimeInForeground ?? '0') ?? 0) ~/ 1000;
      return AppUsageEvent(
        appName: s.packageName ?? 'Unknown app',
        packageName: s.packageName,
        duration: Duration(seconds: seconds),
        windowStart: start,
        windowEnd: end,
      );
    }).toList()
      ..sort((a, b) => b.duration.compareTo(a.duration));
  }

  Future<ScreenTimeEvent> queryTodayScreenTime() async {
    final now = DateTime.now();
    final startOfDay = DateTime(now.year, now.month, now.day);
    final usage = await queryUsage(start: startOfDay, end: now);
    final total = usage.fold<Duration>(
      Duration.zero,
      (sum, e) => sum + e.duration,
    );
    return ScreenTimeEvent(totalToday: total, asOf: now);
  }
}
