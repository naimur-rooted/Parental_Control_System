import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

import '../services/auth_service.dart';
import '../services/background_service.dart';
import '../services/permission_service.dart';
import '../theme/app_theme.dart';
import 'onboarding/permissions_screen.dart';

/// "Settings" tab — transparency controls: see exactly what's shared,
/// re-check permissions, or unpair the device entirely (which a child
/// should always be able to do; it simply notifies the parent dashboard
/// that this device stopped syncing, rather than hiding that fact).
class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _auth = AuthService();
  final _permissionService = PermissionService();
  Map<Permission, PermissionStatus> _statuses = {};

  @override
  void initState() {
    super.initState();
    _refreshStatuses();
  }

  Future<void> _refreshStatuses() async {
    final Map<Permission, PermissionStatus> results = {};
    for (final item in PermissionService.items) {
      results[item.permission] = await item.permission.status;
    }
    if (mounted) setState(() => _statuses = results);
  }

  Future<void> _confirmUnpair() async {
    final token = await _auth.getDeviceToken();
    final TextEditingController _controller = TextEditingController();
    String? _error;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Unpair this device?'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'This stops all monitoring and sync. Enter the parent pairing code to confirm.',
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _controller,
                decoration: InputDecoration(
                  labelText: 'Pairing Code',
                  errorText: _error,
                  border: const OutlineInputBorder(),
                ),
                obscureText: true,
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            TextButton(
              onPressed: () {
                if (_controller.text == token) {
                  Navigator.pop(ctx, true);
                } else {
                  setDialogState(() {
                    _error = 'Incorrect code';
                  });
                }
              },
              child: const Text('Unpair', style: TextStyle(color: AppColors.danger)),
            ),
          ],
        ),
      ),
    );

    if (confirmed == true) {
      await BackgroundServiceManager().stop();
      await _auth.clear();
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const PermissionsScreen()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Settings', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('What is being shared with your parent', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                const _ShareLine(text: 'Live & recent GPS location'),
                const _ShareLine(text: 'App usage & total screen time'),
                const _ShareLine(text: 'Battery level & network type'),
                const _ShareLine(text: 'Last sync timestamp'),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Card(
          child: Column(
            children: [
              const Padding(
                padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text('Permissions', style: TextStyle(fontWeight: FontWeight.w600)),
                ),
              ),
              ...PermissionService.items.map((item) {
                final status = _statuses[item.permission];
                return ListTile(
                  title: Text(item.title),
                  trailing: Icon(
                    status?.isGranted == true ? Icons.check_circle : Icons.error_outline,
                    color: status?.isGranted == true ? AppColors.success : AppColors.warning,
                  ),
                  onTap: () async {
                    await _permissionService.requestOne(item.permission);
                    _refreshStatuses();
                  },
                );
              }),
              TextButton(onPressed: openAppSettings, child: const Text('Open system app settings')),
            ],
          ),
        ),
        const SizedBox(height: 16),
        OutlinedButton.icon(
          onPressed: _confirmUnpair,
          icon: const Icon(Icons.link_off, color: AppColors.danger),
          label: const Text('Unpair this device', style: TextStyle(color: AppColors.danger)),
          style: OutlinedButton.styleFrom(side: const BorderSide(color: AppColors.danger)),
        ),
      ],
    );
  }
}

class _ShareLine extends StatelessWidget {
  final String text;
  const _ShareLine({required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          const Icon(Icons.check, size: 16, color: AppColors.success),
          const SizedBox(width: 8),
          Text(text),
        ],
      ),
    );
  }
}
