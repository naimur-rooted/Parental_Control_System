import 'package:shared_preferences/shared_preferences.dart';

/// Stores the pairing token the parent generates on the Lovable dashboard.
///
/// NOTE ON SECURITY: `shared_preferences` is plaintext storage backed by
/// platform prefs (NSUserDefaults / SharedPreferences). It is convenient and
/// was explicitly requested, but it is not encrypted at rest. For a
/// production release, consider swapping this for `flutter_secure_storage`
/// (Keychain / Keystore-backed) with the same method signatures below —
/// the rest of the app only depends on this class's interface.
class AuthService {
  static const _kDeviceTokenKey = 'fg_device_token';
  static const _kChildIdKey = 'fg_child_id';
  static const _kPairedAtKey = 'fg_paired_at';
  static const _kLastSyncKey = 'fg_last_sync';

  Future<void> saveDeviceToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kDeviceTokenKey, token);
    await prefs.setString(_kPairedAtKey, DateTime.now().toIso8601String());
  }

  Future<String?> getDeviceToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_kDeviceTokenKey);
  }

  Future<bool> isPaired() async {
    final token = await getDeviceToken();
    return token != null && token.trim().isNotEmpty;
  }

  Future<void> saveChildId(String id) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kChildIdKey, id);
  }

  Future<String?> getChildId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_kChildIdKey);
  }

  Future<void> setLastSync(DateTime time) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kLastSyncKey, time.toIso8601String());
  }

  Future<DateTime?> getLastSync() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kLastSyncKey);
    if (raw == null) return null;
    return DateTime.tryParse(raw);
  }

  /// Full reset — used from Settings > "Unpair this device".
  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kDeviceTokenKey);
    await prefs.remove(_kChildIdKey);
    await prefs.remove(_kPairedAtKey);
    await prefs.remove(_kLastSyncKey);
  }
}
