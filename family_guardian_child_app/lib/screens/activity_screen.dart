import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/device_status.dart';
import '../services/auth_service.dart';
import '../services/device_status_service.dart';
import '../services/location_service.dart';
import '../services/usage_service.dart';
import '../theme/app_theme.dart';
import '../widgets/collapsible_panel.dart';
import '../widgets/status_header.dart';

/// "Activity" tab — a transparent, real-time-ish log of exactly what has
/// been captured: recent location pings and recent app usage. This is a
/// mirror of what the parent sees, not a curated subset.
class ActivityScreen extends StatefulWidget {
  const ActivityScreen({super.key});

  @override
  State<ActivityScreen> createState() => _ActivityScreenState();
}

class _ActivityScreenState extends State<ActivityScreen> {
  final _location = LocationService();
  final _usage = UsageService();
  final _deviceStatus = DeviceStatusService();
  final _auth = AuthService();

  DeviceStatus _status = const DeviceStatus();
  DateTime? _lastSync;
  LocationEvent? _lastLocation;
  List<AppUsageEvent> _usageEvents = [];
  bool _usagePermissionGranted = false;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    _status = await _deviceStatus.current();
    _lastSync = await _auth.getLastSync();
    _lastLocation = await _location.getCurrentLocation();
    _usagePermissionGranted = await _usage.hasPermission();
    if (_usagePermissionGranted) {
      _usageEvents = await _usage.queryUsage(
        start: DateTime.now().subtract(const Duration(hours: 6)),
        end: DateTime.now(),
      );
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          StatusHeader(status: _status, lastSync: _lastSync, monitoringActive: true),
          const SizedBox(height: 16),
          CollapsiblePanel(
            title: 'Location pings',
            icon: Icons.location_on_outlined,
            initiallyExpanded: true,
            child: _lastLocation == null
                ? const Text('No location captured yet.', style: TextStyle(color: AppColors.textSecondary))
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Latest: ${_lastLocation!.latitude.toStringAsFixed(5)}, '
                          '${_lastLocation!.longitude.toStringAsFixed(5)}'),
                      const SizedBox(height: 4),
                      Text(
                        DateFormat('MMM d, h:mm:ss a').format(_lastLocation!.timestamp),
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                      ),
                    ],
                  ),
          ),
          const SizedBox(height: 12),
          CollapsiblePanel(
            title: 'App usage (last 6 hours)',
            icon: Icons.apps_outlined,
            child: !_usagePermissionGranted
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Usage Access has not been granted yet, so app usage cannot be measured.',
                        style: TextStyle(color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: () async {
                          await _usage.openUsageAccessSettings();
                        },
                        child: const Text('Open Usage Access settings'),
                      ),
                    ],
                  )
                : (_usageEvents.isEmpty
                    ? const Text('No usage recorded in this window.', style: TextStyle(color: AppColors.textSecondary))
                    : Column(
                        children: _usageEvents
                            .take(10)
                            .map((e) => ListTile(
                                  contentPadding: EdgeInsets.zero,
                                  leading: const Icon(Icons.smartphone, size: 20),
                                  title: Text(e.appName),
                                  trailing: Text(_formatDuration(e.duration)),
                                ))
                            .toList(),
                      )),
          ),
        ],
      ),
    );
  }

  String _formatDuration(Duration d) {
    final h = d.inHours;
    final m = d.inMinutes % 60;
    if (h > 0) return '${h}h ${m}m';
    return '${m}m';
  }
}
