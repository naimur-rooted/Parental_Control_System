import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../models/device_status.dart';
import '../services/auth_service.dart';
import '../services/device_status_service.dart';
import '../services/location_service.dart';
import '../services/sync_service.dart';
import '../theme/app_theme.dart';
import '../widgets/status_header.dart';

/// "Map" tab — shows the child's own current + recent location, exactly
/// as it appears on the parent's dashboard. Nothing here is hidden from
/// the child: this is the same feed being sent upstream.
class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final _locationService = LocationService();
  final _deviceStatusService = DeviceStatusService();
  final _auth = AuthService();
  final _sync = SyncService();

  GoogleMapController? _mapController;
  LocationEvent? _current;
  DeviceStatus _status = const DeviceStatus();
  DateTime? _lastSync;
  final List<LocationEvent> _history = [];
  bool _loading = true;
  String? _syncMessage;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    _lastSync = await _auth.getLastSync();
    _status = await _deviceStatusService.current();
    final loc = await _locationService.getCurrentLocation();
    if (loc != null) {
      _current = loc;
      _history.add(loc);
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _syncNow() async {
    setState(() => _syncMessage = 'Syncing...');
    final result = await _sync.runOnce();
    _lastSync = await _auth.getLastSync();
    final loc = await _locationService.getCurrentLocation();
    if (loc != null) {
      _current = loc;
      _history.add(loc);
    }
    if (mounted) setState(() => _syncMessage = result);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          StatusHeader(status: _status, lastSync: _lastSync, monitoringActive: true),
          const SizedBox(height: 16),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: _current == null
                  ? Container(
                      color: Colors.grey.shade100,
                      alignment: Alignment.center,
                      child: const Text('Waiting for a GPS fix...'),
                    )
                  : GoogleMap(
                      initialCameraPosition: CameraPosition(
                        target: LatLng(_current!.latitude, _current!.longitude),
                        zoom: 15,
                      ),
                      onMapCreated: (c) => _mapController = c,
                      markers: {
                        Marker(
                          markerId: const MarkerId('me'),
                          position: LatLng(_current!.latitude, _current!.longitude),
                          infoWindow: const InfoWindow(title: 'You are here'),
                        ),
                      },
                      polylines: _history.length > 1
                          ? {
                              Polyline(
                                polylineId: const PolylineId('history'),
                                points: _history.map((e) => LatLng(e.latitude, e.longitude)).toList(),
                                color: AppColors.gradientStart,
                                width: 3,
                              ),
                            }
                          : {},
                      myLocationEnabled: true,
                      myLocationButtonEnabled: true,
                    ),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _syncNow,
                  icon: const Icon(Icons.sync),
                  label: const Text('Sync now'),
                ),
              ),
            ],
          ),
          if (_syncMessage != null) ...[
            const SizedBox(height: 8),
            Text(_syncMessage!, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
          ],
        ],
      ),
    );
  }
}
