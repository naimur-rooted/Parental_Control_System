import 'package:location/location.dart' as loc;
import '../models/device_status.dart';

/// Wraps the `location` package: permission checks, one-off fetches, and
/// an optional stream for the in-app live map.
class LocationService {
  final loc.Location _location = loc.Location();

  Future<bool> ensureServiceAndPermission() async {
    bool serviceEnabled = await _location.serviceEnabled();
    if (!serviceEnabled) {
      serviceEnabled = await _location.requestService();
      if (!serviceEnabled) return false;
    }

    var permission = await _location.hasPermission();
    if (permission == loc.PermissionStatus.denied) {
      permission = await _location.requestPermission();
    }
    return permission == loc.PermissionStatus.granted ||
        permission == loc.PermissionStatus.grantedLimited;
  }

  /// Configures update interval/accuracy for background pings. Called once
  /// during app + background-isolate startup.
  Future<void> configure() async {
    await _location.changeSettings(
      accuracy: loc.LocationAccuracy.balanced,
      interval: 60 * 1000, // ms
      distanceFilter: 25, // meters
    );
    await _location.enableBackgroundMode(enable: true);
  }

  Future<LocationEvent?> getCurrentLocation() async {
    final ok = await ensureServiceAndPermission();
    if (!ok) return null;
    final data = await _location.getLocation();
    if (data.latitude == null || data.longitude == null) return null;
    return LocationEvent(
      latitude: data.latitude!,
      longitude: data.longitude!,
      accuracy: data.accuracy,
      timestamp: DateTime.now(),
    );
  }

  Stream<loc.LocationData> get liveUpdates => _location.onLocationChanged;
}
