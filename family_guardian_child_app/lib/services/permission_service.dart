import 'package:permission_handler/permission_handler.dart';

/// Every permission request the app makes, and *why* — surfaced verbatim
/// in the onboarding screen so the child sees exactly what is being asked
/// for and can see the same list their parent sees on the dashboard.
class PermissionItem {
  final String title;
  final String rationale;
  final Permission permission;
  final bool isCritical; // blocks activation if denied

  const PermissionItem({
    required this.title,
    required this.rationale,
    required this.permission,
    this.isCritical = true,
  });
}

class PermissionService {
  static final List<PermissionItem> items = [
    const PermissionItem(
      title: 'Location',
      rationale:
          'Lets your parent see where you are on the family map. You can view the same location history yourself in the Map tab.',
      permission: Permission.locationAlways,
    ),
    const PermissionItem(
      title: 'Physical Activity / Usage Access',
      rationale:
          'Needed to report screen time and which apps are used, so both you and your parent can see the same usage charts.',
      permission: Permission.activityRecognition,
      isCritical: false,
    ),
    const PermissionItem(
      title: 'Notifications',
      rationale:
          'Used to let you know when monitoring status changes or a rule is about to take effect (e.g. bedtime).',
      permission: Permission.notification,
      isCritical: false,
    ),
    const PermissionItem(
      title: 'Ignore Battery Optimizations',
      rationale:
          'Prevents the operating system from stopping background sync, so your status stays accurate and up to date.',
      permission: Permission.ignoreBatteryOptimizations,
      isCritical: false,
    ),
  ];

  Future<Map<Permission, PermissionStatus>> requestAll() async {
    final Map<Permission, PermissionStatus> results = {};
    for (final item in items) {
      results[item.permission] = await item.permission.request();
    }
    return results;
  }

  Future<PermissionStatus> requestOne(Permission p) => p.request();

  Future<bool> allCriticalGranted() async {
    for (final item in items.where((i) => i.isCritical)) {
      final status = await item.permission.status;
      if (!status.isGranted) return false;
    }
    return true;
  }

  /// Special-cased: Android's "Usage Access" (PACKAGE_USAGE_STATS) cannot be
  /// requested via a normal runtime dialog — it requires sending the user to
  /// a system settings screen. The `usage_stats` package exposes this via
  /// `UsageStats.checkUsagePermission()` / `grantUsagePermission()` at the
  /// call site in usage_service.dart.
}
