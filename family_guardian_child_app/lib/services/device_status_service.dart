import 'package:battery_plus/battery_plus.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../models/device_status.dart';

class DeviceStatusService {
  final Battery _battery = Battery();
  final Connectivity _connectivity = Connectivity();

  Future<DeviceStatus> current() async {
    final level = await _battery.batteryLevel;
    final connectivityResults = await _connectivity.checkConnectivity();
    final primary = connectivityResults.isNotEmpty
        ? connectivityResults.first
        : ConnectivityResult.none;

    return DeviceStatus(
      batteryPercent: level,
      networkType: _mapNetwork(primary),
    );
  }

  Stream<BatteryState> get batteryStateStream => _battery.onBatteryStateChanged;
  Stream<List<ConnectivityResult>> get connectivityStream =>
      _connectivity.onConnectivityChanged;

  String _mapNetwork(ConnectivityResult result) {
    switch (result) {
      case ConnectivityResult.wifi:
        return 'wifi';
      case ConnectivityResult.mobile:
        return 'mobile';
      case ConnectivityResult.ethernet:
        return 'ethernet';
      case ConnectivityResult.vpn:
        return 'vpn';
      case ConnectivityResult.bluetooth:
        return 'bluetooth';
      case ConnectivityResult.none:
        return 'none';
      default:
        return 'unknown';
    }
  }
}
