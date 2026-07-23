import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../services/permission_service.dart';
import '../../theme/app_theme.dart';
import 'login_screen.dart';

/// Step 1 of onboarding. Explains, in plain language, exactly what each
/// permission is for before asking for it — this is the transparency
/// contract of the whole app.
class PermissionsScreen extends StatefulWidget {
  const PermissionsScreen({super.key});

  @override
  State<PermissionsScreen> createState() => _PermissionsScreenState();
}

class _PermissionsScreenState extends State<PermissionsScreen> {
  final _permissionService = PermissionService();
  final Map<Permission, PermissionStatus> _statuses = {};
  bool _requesting = false;

  Future<void> _requestAll() async {
    setState(() => _requesting = true);
    final results = await _permissionService.requestAll();
    setState(() {
      _statuses.addAll(results);
      _requesting = false;
    });
  }

  void _continue() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.shield_moon_outlined, size: 48, color: AppColors.gradientStart),
              const SizedBox(height: 16),
              Text(
                'Before we start',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                'Family Guardian only works when you know exactly what it does. '
                "Here's every permission it asks for and why — nothing happens silently.",
                style: TextStyle(color: AppColors.textSecondary),
              ),
              const SizedBox(height: 20),
              Expanded(
                child: ListView.separated(
                  itemCount: PermissionService.items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final item = PermissionService.items[index];
                    final status = _statuses[item.permission];
                    return Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(
                              status?.isGranted == true
                                  ? Icons.check_circle
                                  : Icons.radio_button_unchecked,
                              color: status?.isGranted == true
                                  ? AppColors.success
                                  : Colors.grey,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(item.title, style: const TextStyle(fontWeight: FontWeight.w600)),
                                  const SizedBox(height: 4),
                                  Text(item.rationale, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _requesting ? null : (_statuses.isEmpty ? _requestAll : _continue),
                  child: Text(_requesting
                      ? 'Requesting...'
                      : (_statuses.isEmpty ? 'Review & allow permissions' : 'Continue')),
                ),
              ),
              if (_statuses.isNotEmpty)
                TextButton(
                  onPressed: _requesting ? null : _requestAll,
                  child: const Text('Re-check permissions'),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
