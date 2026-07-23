import 'package:flutter/material.dart';

import '../models/child_profile.dart';
import '../services/api_service.dart';
import '../widgets/gradient_sidebar.dart';
import '../theme/app_theme.dart';
import 'map_screen.dart';
import 'activity_screen.dart';
import 'reports_screen.dart';
import 'rules_screen.dart';
import 'settings_screen.dart';
import 'dart:async';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;
  final _api = ApiService();
  ChildProfile? _profile;
  Timer? _pollTimer;
  bool _isBedtimeLocked = false;

  @override
  void initState() {
    super.initState();
    _startPolling();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  void _startPolling() {
    _updateStatus();
    _pollTimer = Timer.periodic(const Duration(seconds: ApiConfig.statusPollIntervalSeconds), (_) {
      _updateStatus();
    });
  }

  Future<void> _updateStatus() async {
    try {
      final profile = await _api.fetchChildProfile();
      if (mounted) {
        setState(() {
          _profile = profile;
          _checkBedtime(profile);
        });
      }
    } catch (_) {}
  }

  void _checkBedtime(ChildProfile profile) {
    final now = DateTime.now();
    final timeStr = "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}";
    
    bool locked = false;
    for (final rule in profile.rules) {
      if (rule.enabled && rule.ruleType == 'bedtime' && rule.config != null) {
        final start = rule.config!['startTime'] as String?;
        final end = rule.config!['endTime'] as String?;
        if (start != null && end != null) {
          if (_isCurrentTimeBetween(timeStr, start, end)) {
            locked = true;
            break;
          }
        }
      }
    }
    _isBedtimeLocked = locked;
  }

  bool _isCurrentTimeBetween(String now, String start, String end) {
    if (start.compareTo(end) <= 0) {
      return now.compareTo(start) >= 0 && now.compareTo(end) < 0;
    } else {
      // Overnight rule (e.g., 22:00 to 06:00)
      return now.compareTo(start) >= 0 || now.compareTo(end) < 0;
    }
  }

  static const _items = [
    SidebarItem(Icons.map_outlined, 'Map'),
    SidebarItem(Icons.timeline_outlined, 'Activity'),
    SidebarItem(Icons.bar_chart_outlined, 'Reports'),
    SidebarItem(Icons.rule_outlined, 'Rules'),
    SidebarItem(Icons.settings_outlined, 'Settings'),
  ];

  static const _pages = [
    MapScreen(),
    ActivityScreen(),
    ReportsScreen(),
    RulesScreen(),
    SettingsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final locked = (_profile?.isLocked ?? false) || _isBedtimeLocked;

    return Stack(
      children: [
        _buildContent(context),
        if (locked) _buildLockOverlay(),
      ],
    );
  }

  Widget _buildContent(BuildContext context) {
    final isWide = MediaQuery.of(context).size.width >= 700;

    if (isWide) {
      return Scaffold(
        body: Row(
          children: [
            GradientSidebar(
              items: _items,
              currentIndex: _index,
              onTap: (i) => setState(() => _index = i),
            ),
            Expanded(child: SafeArea(child: _pages[_index])),
          ],
        ),
      );
    }

    return Scaffold(
      body: SafeArea(child: _pages[_index]),
      bottomNavigationBar: GradientBottomNav(
        items: _items,
        currentIndex: _index,
        onTap: (i) => setState(() => _index = i),
      ),
    );
  }

  Widget _buildLockOverlay() {
    return Container(
      color: Colors.black.withOpacity(0.9),
      width: double.infinity,
      height: double.infinity,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.lock_clock, size: 100, color: Colors.white),
          const SizedBox(height: 24),
          Text(
            _isBedtimeLocked ? "Bedtime Lock Active" : "Device Locked",
            style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold, decoration: TextDecoration.none),
          ),
          const SizedBox(height: 16),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 40),
            child: Text(
              "Your parent has locked this device. Please talk to them to regain access.",
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white70, fontSize: 16, decoration: TextDecoration.none),
            ),
          ),
        ],
      ),
    );
  }
}
