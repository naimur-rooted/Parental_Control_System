import 'dart:async';
import 'dart:ui';

import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_background_service_android/flutter_background_service_android.dart';

import 'sync_service.dart';
import '../theme/app_theme.dart';

class BackgroundServiceManager {
  static const _notificationChannelId = 'family_guardian_monitoring';
  static const _notificationId = 888;

  Future<void> initialize() async {
    final service = FlutterBackgroundService();

    await service.configure(
      androidConfiguration: AndroidConfiguration(
        onStart: _onStart,
        autoStart: true,
        isForegroundMode: true,
        notificationChannelId: _notificationChannelId,
        initialNotificationTitle: 'Family Guardian Active',
        initialNotificationContent: 'Monitoring device safety...',
        foregroundServiceNotificationId: _notificationId,
      ),
      iosConfiguration: IosConfiguration(
        autoStart: true,
        onForeground: _onStart,
      ),
    );

    await service.startService();
  }

  Future<void> stop() async {
    final service = FlutterBackgroundService();
    service.invoke('stopService');
  }
}

@pragma('vm:entry-point')
void _onStart(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();

  service.on('stopService').listen((event) {
    service.stopSelf();
  });

  final sync = SyncService();

  // Status Polling Loop (10s)
  Timer.periodic(const Duration(seconds: ApiConfig.statusPollIntervalSeconds), (timer) async {
    final result = await sync.pollStatus();
    if (service is AndroidServiceInstance) {
      service.setForegroundNotificationInfo(
        title: 'Family Guardian Active',
        content: result,
      );
    }
  });

  // Telemetry Ingestion Loop (30s)
  Timer.periodic(const Duration(seconds: ApiConfig.telemetryIntervalSeconds), (timer) async {
    await sync.sendTelemetry();
  });
}
