/// Snapshot of the device's battery + network state, sent alongside every
/// ingest event so the parent dashboard can show device health.
class DeviceStatus {
  final int? batteryPercent;
  final String? networkType; // "wifi" | "mobile" | "none" | "unknown"

  const DeviceStatus({this.batteryPercent, this.networkType});

  Map<String, dynamic> toJson() => {
        if (batteryPercent != null) 'batteryPercent': batteryPercent,
        if (networkType != null) 'networkType': networkType,
      };

  DeviceStatus copyWith({int? batteryPercent, String? networkType}) {
    return DeviceStatus(
      batteryPercent: batteryPercent ?? this.batteryPercent,
      networkType: networkType ?? this.networkType,
    );
  }
}

/// A single point of GPS data.
class LocationEvent {
  final double latitude;
  final double longitude;
  final double? accuracy;
  final DateTime timestamp;

  LocationEvent({
    required this.latitude,
    required this.longitude,
    this.accuracy,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() => {
        'type': 'location',
        'latitude': latitude,
        'longitude': longitude,
        if (accuracy != null) 'accuracy': accuracy,
        'occurred_at': timestamp.toUtc().toIso8601String(),
      };
}

/// A single app-usage / screen-time sample.
class AppUsageEvent {
  final String appName;
  final String? packageName;
  final Duration duration;
  final DateTime windowStart;
  final DateTime windowEnd;

  AppUsageEvent({
    required this.appName,
    this.packageName,
    required this.duration,
    required this.windowStart,
    required this.windowEnd,
  });

  Map<String, dynamic> toJson() => {
        'type': 'app_usage',
        'app_name': appName,
        if (packageName != null) 'package_name': packageName,
        'duration_seconds': duration.inSeconds,
        'window_start': windowStart.toUtc().toIso8601String(),
        'window_end': windowEnd.toUtc().toIso8601String(),
      };
}

/// Aggregate screen-time-only event (used for the simple "total today" ping).
class ScreenTimeEvent {
  final Duration totalToday;
  final DateTime asOf;

  ScreenTimeEvent({required this.totalToday, required this.asOf});

  Map<String, dynamic> toJson() => {
        'type': 'screen_time',
        'total_seconds_today': totalToday.inSeconds,
        'as_of': asOf.toUtc().toIso8601String(),
      };
}
