import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:battery_plus/battery_plus.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:location/location.dart';
import 'package:intl/intl.dart';
import 'package:usage_stats/usage_stats.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:call_log/call_log.dart';
import 'package:device_apps/device_apps.dart';

// Import existing models
import 'models/child_profile.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const TimesUpApp());
}

// -------------------------------------------------------------------------
// 1. CONFIGURATION
// -------------------------------------------------------------------------
class AppConfig {
  static const String devUrl = "https://ais-dev-ruqulu6ovx5bhtijsiqgk3-227329294413.asia-southeast1.run.app";
  static const String prodUrl = "https://times-up-backend.onrender.com";
  
  static const String serverUrl = prodUrl;
  
  static const int pollIntervalSecs = 5;
  static const int ingestIntervalSecs = 30;
}

// -------------------------------------------------------------------------
// 2. THEME & COLORS
// -------------------------------------------------------------------------
class AppColors {
  static const Color primary = Color(0xFF6D28D9); // Violet
  static const Color accent = Color(0xFF2563EB); // Blue
  static const Color background = Color(0xFFF3F4F6);
  static const Color lockOverlay = Color(0xEE111827); // Dark
  static const Color danger = Color(0xFFDC2626);
}

// -------------------------------------------------------------------------
// 3. API SERVICE
// -------------------------------------------------------------------------
class ApiService {
  final String token;
  ApiService(this.token);

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    'X-Device-Token': token,
  };

  Future<ChildProfile> fetchProfile() async {
    final response = await http.get(
      Uri.parse("${AppConfig.serverUrl}/api/public/child/me"),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      if (response.headers['content-type']?.contains('text/html') ?? false) {
        throw Exception("Server returned HTML instead of data. Please check your website configuration.");
      }
      try {
        return ChildProfile.fromJson(jsonDecode(response.body));
      } catch (e) {
        throw Exception("Failed to parse server data.");
      }
    } else if (response.statusCode == 401 || response.statusCode == 403) {
      try {
        final err = jsonDecode(response.body);
        throw Exception(err['error'] ?? "Invalid pairing code.");
      } catch (_) {
        throw Exception("Invalid pairing code.");
      }
    } else {
      throw Exception("Server Error (${response.statusCode})");
    }
  }

  Future<void> ingest({required Map<String, dynamic> device, required List<Map<String, dynamic>> logs}) async {
    await http.post(
      Uri.parse("${AppConfig.serverUrl}/api/public/ingest"),
      headers: _headers,
      body: jsonEncode({
        'device': device,
        'logs': logs,
      }),
    );
  }

  Future<void> acknowledgeCommand(String commandId, String status) async {
    await http.post(
      Uri.parse("${AppConfig.serverUrl}/api/public/child/ack"),
      headers: _headers,
      body: jsonEncode({
        'commandId': commandId,
        'status': status,
      }),
    );
  }
}

// -------------------------------------------------------------------------
// 4. MAIN APP ENTRY
// -------------------------------------------------------------------------
class TimesUpApp extends StatelessWidget {
  const TimesUpApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "Time's Up",
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: AppColors.primary),
        useMaterial3: true,
      ),
      home: const _RootController(),
    );
  }
}

class _RootController extends StatefulWidget {
  const _RootController();

  @override
  State<_RootController> createState() => _RootControllerState();
}

class _RootControllerState extends State<_RootController> {
  String? _pairedToken;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _checkPairing();
  }

  Future<void> _checkPairing() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('device_token');
    
    if (token != null) {
      try {
        final api = ApiService(token);
        await api.fetchProfile();
        setState(() {
          _pairedToken = token;
          _isLoading = false;
        });
      } catch (e) {
        if (e.toString().contains("401") || e.toString().contains("Invalid pairing code")) {
          await prefs.remove('device_token');
          setState(() {
            _pairedToken = null;
            _isLoading = false;
          });
        } else {
          setState(() {
            _pairedToken = token;
            _isLoading = false;
          });
        }
      }
    } else {
      setState(() {
        _pairedToken = null;
        _isLoading = false;
      });
    }
  }

  void _onPaired(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('device_token', token);
    setState(() => _pairedToken = token);
  }

  void _onUnpair() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('device_token');
    setState(() => _pairedToken = null);
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_pairedToken == null) {
      return PairingScreen(onPaired: _onPaired);
    }

    return ChildDashboard(
      token: _pairedToken!,
      onUnpair: _onUnpair,
    );
  }
}

// -------------------------------------------------------------------------
// 5. PAIRING SCREEN
// -------------------------------------------------------------------------
class PairingScreen extends StatefulWidget {
  final Function(String) onPaired;
  const PairingScreen({super.key, required this.onPaired});

  @override
  State<PairingScreen> createState() => _PairingScreenState();
}

class _PairingScreenState extends State<PairingScreen> {
  final _controller = TextEditingController();
  bool _loading = false;
  String? _error;

  Future<void> _connect() async {
    final token = _controller.text.trim();
    if (token.isEmpty) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final api = ApiService(token);
      await api.fetchProfile();
      widget.onPaired(token);
    } catch (e) {
      String msg = e.toString().replaceFirst("Exception: ", "");
      if (msg.contains("SocketException") || msg.contains("host lookup")) {
        msg = "No Internet connection on this device. Please check your Emulator's WiFi settings.";
      }
      setState(() => _error = msg);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.link_rounded, size: 80, color: AppColors.primary),
              const SizedBox(height: 24),
              const Text(
                "Pair with your family",
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              const Text(
                "Enter the code from your parent's dashboard",
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 40),
              TextField(
                controller: _controller,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, letterSpacing: 4),
                decoration: InputDecoration(
                  hintText: "e.g. abd42be0",
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: AppColors.primary, width: 2),
                  ),
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 16),
                Text(_error!, style: const TextStyle(color: AppColors.danger), textAlign: TextAlign.center),
              ],
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _loading ? null : _connect,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: _loading 
                    ? const CircularProgressIndicator(color: Colors.white) 
                    : const Text("Connect", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// -------------------------------------------------------------------------
// 6. CHILD DASHBOARD
// -------------------------------------------------------------------------
class ChildDashboard extends StatefulWidget {
  final String token;
  final VoidCallback onUnpair;
  const ChildDashboard({super.key, required this.token, required this.onUnpair});

  @override
  State<ChildDashboard> createState() => _ChildDashboardState();
}

class _ChildDashboardState extends State<ChildDashboard> with WidgetsBindingObserver {
  static const _adminChannel = MethodChannel('com.example.family_guardian/device_admin');
  late ApiService _api;
  ChildProfile? _profile;
  Timer? _pollTimer;
  Timer? _ingestTimer;
  int? _lastSyncedCallTimestamp;
  
  // Track last sent usage to calculate deltas and prevent double-counting
  final Map<String, int> _lastSentForegroundTime = {};
  
  int _secondsUsedToday = 0;
  bool _isBedtimeLocked = false;
  bool _isLimitExceeded = false;
  bool _isAppBlocked = false;
  bool _isAdminActive = false;
  bool _canDrawOverlays = false;
  bool _isAccessibilityEnabled = false;
  String _blockedAppName = "";
  String _lastSentUrl = "";

  final Battery _battery = Battery();
  final Connectivity _connectivity = Connectivity();
  final Location _location = Location();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _api = ApiService(widget.token);
    _requestPermissions();
    _checkStatus();
    _startTimers();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _pollTimer?.cancel();
    _ingestTimer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _checkStatus(); // Automatically refresh permission status when returning to app
    }
  }

  Future<void> _checkStatus() async {
    try {
      final bool admin = await _adminChannel.invokeMethod('isAdminActive');
      final bool overlay = await _adminChannel.invokeMethod('canDrawOverlays');
      final bool accessibility = await _adminChannel.invokeMethod('isAccessibilityEnabled');
      if (mounted) {
        setState(() {
          _isAdminActive = admin;
          _canDrawOverlays = overlay;
          _isAccessibilityEnabled = accessibility;
        });
      }
    } catch (_) {}
  }

  Future<void> _activateAdmin() async {
    await _adminChannel.invokeMethod('activateAdmin');
  }

  Future<void> _requestOverlayPermission() async {
    await _adminChannel.invokeMethod('requestOverlayPermission');
  }

  Future<void> _openAccessibilitySettings() async {
    await _adminChannel.invokeMethod('openAccessibilitySettings');
  }

  Future<void> _requestPermissions() async {
    await [
      Permission.location,
      Permission.phone,
      Permission.sms,
      Permission.notification,
      Permission.systemAlertWindow, // Added for overlay
    ].request();
    
    // Usage stats permission is special
    UsageStats.grantUsagePermission();
  }

  void _startTimers() {
    _pollStatus();
    _pollTimer = Timer.periodic(const Duration(seconds: AppConfig.pollIntervalSecs), (_) => _pollStatus());
    _ingestTimer = Timer.periodic(const Duration(seconds: AppConfig.ingestIntervalSecs), (_) => _ingestTelemetry());
    
    Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) {
        setState(() => _secondsUsedToday++);
        _evaluateRules();
      }
    });
  }

  Future<void> _pollStatus() async {
    try {
      final profile = await _api.fetchProfile();
      if (mounted) {
        setState(() => _profile = profile);
        _evaluateRules();
        _handleCommands(profile.pendingCommands);
      }
    } catch (e) {
      debugPrint("Polling error: $e");
    }
  }

  Future<void> _ingestTelemetry() async {
    try {
      final level = await _battery.batteryLevel;
      final conn = await _connectivity.checkConnectivity();
      final locData = await _location.getLocation();

      DateTime now = DateTime.now();
      String occurredAt = now.toUtc().toIso8601String();
      
      List<Map<String, dynamic>> logs = [];

      // 1. App Usage (Last 1 hour with DELTA calculation to prevent double counting)
      try {
        DateTime start = DateTime(now.year, now.month, now.day); // Start of today
        List<UsageInfo> usageStats = await UsageStats.queryUsageStats(start, now);
        
        for (var info in usageStats) {
          final pkg = info.packageName;
          if (pkg == null) continue;

          int totalForeground = int.parse(info.totalTimeInForeground ?? "0");
          int lastSent = _lastSentForegroundTime[pkg] ?? 0;
          
          // Calculate how many NEW milliseconds were used since the last sync
          int deltaMs = totalForeground - lastSent;
          
          if (deltaMs > 0) {
            // To ensure small usages aren't lost, we only send and update if delta is significant 
            // or if it's been a while. For simplicity in a 30s sync:
            if (deltaMs >= 1000) { 
               logs.add({
                'logType': 'app_usage',
                'occurredAt': occurredAt,
                'data': {
                  'package': pkg,
                  'minutes': (deltaMs / 60000), // Send exact fractional minutes
                  'appName': pkg.split('.').last, 
                }
              });
              _lastSentForegroundTime[pkg] = totalForeground;
            }
          }
        }
      } catch (_) {}

      // 2. Installed Apps (logType: "installed_app")
      try {
        List<Application> apps = await DeviceApps.getInstalledApplications(
          includeAppIcons: false,
          includeSystemApps: true,
          onlyAppsWithLaunchIntent: false, 
        );
        for (var app in apps) {
          logs.add({
            'logType': 'installed_app',
            'occurredAt': occurredAt,
            'data': {
              'package': app.packageName,
              'name': app.appName,
              'installedAt': occurredAt,
            }
          });
        }
      } catch (_) {}

      // 3. Call Logs (logType: "call_log")
      try {
        Iterable<CallLogEntry> entries = await CallLog.get();
        for (var entry in entries) {
          if (_lastSyncedCallTimestamp != null && entry.timestamp! <= _lastSyncedCallTimestamp!) continue;

          String type = "incoming";
          if (entry.callType == CallType.outgoing) type = "outgoing";
          if (entry.callType == CallType.missed) type = "missed";

          logs.add({
            'logType': 'call_log',
            'occurredAt': DateTime.fromMillisecondsSinceEpoch(entry.timestamp ?? 0).toUtc().toIso8601String(),
            'data': {
              'number': entry.number,
              'name': entry.name ?? "Unknown",
              'type': type,
              'duration': entry.duration,
            }
          });
        }
        if (entries.isNotEmpty) _lastSyncedCallTimestamp = entries.first.timestamp;
      } catch (_) {}

      // 4. Location (logType: "location")
      logs.add({
        'logType': 'location',
        'occurredAt': occurredAt,
        'data': {
          'latitude': locData.latitude,
          'longitude': locData.longitude,
          'accuracy': locData.accuracy,
        }
      });

      await _api.ingest(
        device: {
          'batteryPercent': level,
          'networkType': conn.first.name,
          'isLocked': (_profile?.isLocked ?? false) || _isBedtimeLocked || _isLimitExceeded || _isAppBlocked,
          'platform': 'android',
        },
        logs: logs,
      );
    } catch (e) {
      debugPrint("Ingestion error: $e");
    }
  }

  Future<void> _evaluateRules() async {
    if (_profile == null) return;
    final now = DateTime.now();
    final timeStr = DateFormat('HH:mm').format(now);

    bool bedtime = false;
    bool limit = false;
    bool appBlocked = false;
    String blockedName = "";

    // 1. GET THE REAL FOREGROUND APP FROM ACCESSIBILITY SERVICE
    String? foregroundPackage;
    try {
      foregroundPackage = await _adminChannel.invokeMethod('getForegroundApp');
    } catch (_) {}

    // 2. CHECK FOR NEW BROWSING URLS AND BLOCK WEBSITES
    String? currentUrl;
    try {
      currentUrl = await _adminChannel.invokeMethod('getLastUrl');
      if (currentUrl != null && currentUrl.isNotEmpty && currentUrl != _lastSentUrl) {
        _lastSentUrl = currentUrl;
        // Instantly ingest the URL log using matching logType "web_visit"
        await _api.ingest(
          device: {'platform': 'android'},
          logs: [{
            'logType': 'web_visit',
            'occurredAt': DateTime.now().toUtc().toIso8601String(),
            'data': {'url': currentUrl}
          }]
        );
      }
    } catch (_) {}

    for (final rule in _profile!.rules) {
      if (!rule.enabled) continue;

      if (rule.ruleType == 'bedtime' && rule.config != null) {
        final start = rule.config!['startTime'] as String?;
        final end = rule.config!['endTime'] as String?;
        if (start != null && end != null) {
          bedtime = _isTimeInRange(timeStr, start, end);
        }
      }

      if (rule.ruleType == 'screen_time_limit' && rule.config != null) {
        final limitMins = int.tryParse(rule.config!['limitMinutes']?.toString() ?? '0') ?? 0;
        if (limitMins > 0 && (_secondsUsedToday / 60) >= limitMins) {
          limit = true;
        }
      }

      if (rule.ruleType == 'blocked_app' && rule.config != null) {
        final blockedPackage = rule.config!['packageName'] as String?;
        if (blockedPackage != null && foregroundPackage == blockedPackage) {
          appBlocked = true;
          blockedName = rule.name;
        }
      }

      // NEW: WEBSITE BLOCKING LOGIC
      if (rule.ruleType == 'blocked_website' && rule.config != null) {
        final blockedDomain = (rule.config!['domain'] ?? rule.config!['url'])?.toString().toLowerCase();
        if (blockedDomain != null && currentUrl != null) {
          if (currentUrl.toLowerCase().contains(blockedDomain)) {
            appBlocked = true;
            blockedName = "Website: $blockedDomain";
          }
        }
      }
    }

    final shouldLock = (_profile?.isLocked ?? false) || bedtime || limit || appBlocked;

    // 3. TRIGGER SYSTEM-WIDE OVERLAY LOCK
    if (shouldLock) {
      await _adminChannel.invokeMethod('showSystemLock', {'reason': blockedName.isNotEmpty ? "$blockedName is blocked" : "Device Locked"});
    } else {
      await _adminChannel.invokeMethod('hideSystemLock');
    }

    setState(() {
      _isBedtimeLocked = bedtime;
      _isLimitExceeded = limit;
      _isAppBlocked = appBlocked;
      _blockedAppName = blockedName;
    });
  }

  bool _isTimeInRange(String current, String start, String end) {
    if (start.compareTo(end) <= 0) {
      return current.compareTo(start) >= 0 && current.compareTo(end) < 0;
    } else {
      return current.compareTo(start) >= 0 || current.compareTo(end) < 0;
    }
  }

  void _handleCommands(List<PendingCommand> commands) async {
    for (final cmd in commands) {
      await _api.acknowledgeCommand(cmd.id, 'ack');
      debugPrint("Executing: ${cmd.command}");
      
      if (cmd.command == 'ring') {
        HapticFeedback.vibrate();
      }
      
      if (cmd.command == 'lock') {
        try {
          await _adminChannel.invokeMethod('lockDevice');
        } catch (_) {}
      }

      if (cmd.command == 'reset') {
        try {
          await _adminChannel.invokeMethod('factoryReset');
        } catch (_) {}
      }

      await _api.acknowledgeCommand(cmd.id, 'done');
    }
  }

  void _emergencyCall() async {
    try {
      await _adminChannel.invokeMethod('emergencyCall');
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final serverLocked = _profile?.isLocked ?? false;
    final isLocked = serverLocked || _isBedtimeLocked || _isLimitExceeded || _isAppBlocked;
    
    String lockReason = "Locked by parent";
    if (_isBedtimeLocked) lockReason = "Bedtime curfew reached";
    if (_isLimitExceeded) lockReason = "Daily screen time limit reached";
    if (_isAppBlocked) lockReason = "$_blockedAppName is blocked";

    return PopScope(
      canPop: !isLocked,
      child: Stack(
        children: [
          Scaffold(
            appBar: AppBar(
              title: Text(_profile?.displayName ?? "Child Device"),
              actions: [
                IconButton(
                  icon: const Icon(Icons.logout),
                  onPressed: () => _showUnpairDialog(),
                )
              ],
            ),
            body: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  _StatusCard(title: "Usage Today", value: "${(_secondsUsedToday / 60).floor()}m", icon: Icons.timer),
                  const SizedBox(height: 16),
                  _StatusCard(title: "Battery", value: "${_profile?.batteryPercent ?? 0}%", icon: Icons.battery_std),
                  const SizedBox(height: 16),
                  _PermissionTile(
                    title: "Device Admin",
                    isActive: _isAdminActive,
                    onTap: _activateAdmin,
                  ),
                  _PermissionTile(
                    title: "Screen Overlay",
                    isActive: _canDrawOverlays,
                    onTap: _requestOverlayPermission,
                  ),
                  _PermissionTile(
                    title: "Guardian Sync",
                    isActive: _isAccessibilityEnabled,
                    onTap: _openAccessibilitySettings,
                  ),
                ],
              ),
            ),
          ),
          if (isLocked) _LockOverlay(reason: lockReason, onEmergencyCall: _emergencyCall),
        ],
      ),
    );
  }

  void _showUnpairDialog() {
    final TextEditingController _unpairController = TextEditingController();
    String? _unpairError;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text("Unpair Device?"),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text("This action requires the parent's pairing code to confirm."),
              const SizedBox(height: 16),
              TextField(
                controller: _unpairController,
                decoration: InputDecoration(
                  labelText: "Enter Pairing Code",
                  errorText: _unpairError,
                  border: const OutlineInputBorder(),
                ),
                obscureText: true,
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancel")),
            TextButton(
              onPressed: () {
                if (_unpairController.text == widget.token) {
                  widget.onUnpair();
                  Navigator.pop(ctx);
                } else {
                  setDialogState(() {
                    _unpairError = "Incorrect code";
                  });
                }
              },
              child: const Text("Unpair", style: TextStyle(color: AppColors.danger)),
            ),
          ],
        ),
      ),
    );
  }
}

class _PermissionTile extends StatelessWidget {
  final String title;
  final bool isActive;
  final VoidCallback onTap;
  const _PermissionTile({required this.title, required this.isActive, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: Icon(Icons.security, color: isActive ? AppColors.primary : AppColors.danger),
        title: Text(title),
        subtitle: Text(isActive ? "Active - Protection Enabled" : "Inactive - Tap to Setup"),
        onTap: isActive ? null : onTap,
        trailing: isActive ? const Icon(Icons.check_circle, color: Colors.green) : const Icon(Icons.warning, color: AppColors.danger),
      ),
    );
  }
}

class _StatusCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  const _StatusCard({required this.title, required this.value, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: Colors.grey.shade200)),
      child: ListTile(
        leading: Icon(icon, color: AppColors.primary),
        title: Text(title, style: const TextStyle(color: Colors.grey)),
        subtitle: Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
      ),
    );
  }
}

class _LockOverlay extends StatelessWidget {
  final String reason;
  final VoidCallback onEmergencyCall;
  const _LockOverlay({required this.reason, required this.onEmergencyCall});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.lockOverlay,
      width: double.infinity,
      height: double.infinity,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.lock_person, size: 100, color: Colors.white),
          const SizedBox(height: 32),
          const Text("Time's Up!", style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold, decoration: TextDecoration.none)),
          const SizedBox(height: 16),
          Text(reason, style: const TextStyle(color: Colors.white70, fontSize: 18, decoration: TextDecoration.none)),
          const SizedBox(height: 60),
          ElevatedButton.icon(
            onPressed: onEmergencyCall,
            icon: const Icon(Icons.phone),
            label: const Text("Emergency Call"),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger, foregroundColor: Colors.white),
          ),
        ],
      ),
    );
  }
}
