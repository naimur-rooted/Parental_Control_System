import 'api_service.dart';
import 'auth_service.dart';
import 'device_status_service.dart';
import 'location_service.dart';
import 'usage_service.dart';

/// Handles status polling (rules/locks) and telemetry ingestion.
class SyncService {
  final ApiService _api;
  final AuthService _auth;
  final LocationService _location;
  final DeviceStatusService _deviceStatus;
  final UsageService _usage;

  SyncService({
    ApiService? api,
    AuthService? auth,
    LocationService? location,
    DeviceStatusService? deviceStatus,
    UsageService? usage,
  })  : _api = api ?? ApiService(),
        _auth = auth ?? AuthService(),
        _location = location ?? LocationService(),
        _deviceStatus = deviceStatus ?? DeviceStatusService(),
        _usage = usage ?? UsageService();

  /// Polls for latest rules, locks, and commands.
  Future<String> pollStatus() async {
    final paired = await _auth.isPaired();
    if (!paired) return 'Not paired.';

    try {
      final profile = await _api.fetchChildProfile();
      
      // Process commands
      for (final cmd in profile.pendingCommands) {
        await _processCommand(cmd.id, cmd.command);
      }

      return 'Status updated at ${DateTime.now().hour}:${DateTime.now().minute}. Locked: ${profile.isLocked}';
    } catch (e) {
      return 'Poll failed: $e';
    }
  }

  /// Sends telemetry (battery, network, location).
  Future<void> sendTelemetry() async {
    final paired = await _auth.isPaired();
    if (!paired) return;

    final logs = <Map<String, dynamic>>[];
    final device = await _deviceStatus.current();

    try {
      final loc = await _location.getCurrentLocation();
      if (loc != null) {
        logs.add({
          'logType': 'location',
          'occurredAt': DateTime.now().toUtc().toIso8601String(),
          'data': {
            'lat': loc.latitude,
            'lng': loc.longitude,
            'accuracy': loc.accuracy,
          }
        });
      }
    } catch (_) {}

    await _api.ingestData(device: device, logs: logs);
  }

  Future<void> _processCommand(String id, String command) async {
    // 1. Acknowledge
    await _api.acknowledgeCommand(id, 'ack');
    
    // 2. Execute (Placeholder for complex actions)
    print('Executing command: $command');
    
    // 3. Done
    await _api.acknowledgeCommand(id, 'done');
  }

  // Legacy for background service
  Future<String> runOnce() async {
    await sendTelemetry();
    return await pollStatus();
  }
}
