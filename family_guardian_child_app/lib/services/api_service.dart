import 'dart:convert';
import 'package:http/http.dart' as http;

import '../models/child_profile.dart';
import '../models/device_status.dart';
import '../theme/app_theme.dart';
import 'auth_service.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  ApiException(this.message, {this.statusCode});
  @override
  String toString() => 'ApiException($statusCode): $message';
}

class ApiService {
  final AuthService _auth;
  final http.Client _client;

  ApiService({AuthService? authService, http.Client? client})
      : _auth = authService ?? AuthService(),
        _client = client ?? http.Client();

  Future<Map<String, String>> _headers() async {
    final token = await _auth.getDeviceToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'X-Device-Token': token,
    };
  }

  Uri _uri(String path) => Uri.parse('${ApiConfig.baseUrl}$path');

  /// GET /api/public/child/me - Validation & Status
  Future<ChildProfile> validateAndFetchProfile(String candidateToken) async {
    final res = await _client.get(
      _uri(ApiConfig.childMePath),
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Token': candidateToken,
      },
    );

    final contentType = res.headers['content-type'] ?? '';
    if (res.statusCode == 200) {
      if (!contentType.contains('application/json')) {
        throw ApiException('Server returned non-JSON response (${res.statusCode}). This usually means a redirect to a login or error page occurred.');
      }
      try {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        return ChildProfile.fromJson(data);
      } catch (e) {
        throw ApiException('Failed to parse server response.');
      }
    }

    final errorMsg = _extractError(res);
    throw ApiException(errorMsg, statusCode: res.statusCode);
  }

  /// GET /api/public/child/me - Polling
  Future<ChildProfile> fetchChildProfile() async {
    final res = await _client.get(_uri(ApiConfig.childMePath), headers: await _headers());
    final contentType = res.headers['content-type'] ?? '';

    if (res.statusCode == 200) {
      if (!contentType.contains('application/json')) {
        throw ApiException('Server returned HTML instead of JSON (Status 200).');
      }
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return ChildProfile.fromJson(data);
    }
    throw ApiException('Failed to load profile (${res.statusCode}).', statusCode: res.statusCode);
  }

  /// POST /api/public/child/ack - Command Acknowledgment
  Future<void> acknowledgeCommand(String commandId, String status) async {
    final res = await _client.post(
      _uri(ApiConfig.ackPath),
      headers: await _headers(),
      body: jsonEncode({
        'commandId': commandId,
        'status': status,
      }),
    );

    if (res.statusCode != 200 && res.statusCode != 204) {
      throw ApiException('Ack failed (${res.statusCode})');
    }
  }

  /// POST /api/public/ingest - Telemetry & Logs
  Future<void> ingestData({
    DeviceStatus? device,
    List<Map<String, dynamic>>? logs,
  }) async {
    final body = jsonEncode({
      if (device != null) 'device': device.toJson(),
      if (logs != null) 'logs': logs,
    });

    final res = await _client.post(
      _uri(ApiConfig.ingestPath),
      headers: await _headers(),
      body: body,
    );

    if (res.statusCode >= 300) {
      throw ApiException('Ingest failed (${res.statusCode})');
    }
    await _auth.setLastSync(DateTime.now());
  }

  // Legacy compatibility
  Future<void> ingestEvents({
    required List<Map<String, dynamic>> events,
    DeviceStatus? device,
    DateTime? lastSync,
  }) async {
    // Mapping events to 'logs' format
    final logs = events.map((e) => {
      'logType': e['type'] ?? 'telemetry',
      'occurredAt': e['occurred_at'] ?? DateTime.now().toUtc().toIso8601String(),
      'data': e,
    }).toList();
    
    await ingestData(device: device, logs: logs);
  }

  String _extractError(http.Response res) {
    try {
      final data = jsonDecode(res.body);
      return data['error'] ?? data['message'] ?? 'Error ${res.statusCode}';
    } catch (_) {
      // If it's HTML, show a snippet or the status code
      if (res.body.contains('<!doctype html>') || res.body.contains('<html>')) {
        return 'Server returned HTML (Error ${res.statusCode}). Check if the API is deployed.';
      }
      return 'Server error (${res.statusCode}): ${res.body.length > 50 ? res.body.substring(0, 50) + '...' : res.body}';
    }
  }
}
