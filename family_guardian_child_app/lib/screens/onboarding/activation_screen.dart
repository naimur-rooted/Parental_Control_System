import 'package:flutter/material.dart';

import '../../models/child_profile.dart';
import '../../services/background_service.dart';
import '../../theme/app_theme.dart';
import '../home_shell.dart';

/// Step 3: confirm what will now start happening, then kick off the
/// background service and drop into the main app.
class ActivationScreen extends StatefulWidget {
  final ChildProfile profile;
  const ActivationScreen({super.key, required this.profile});

  @override
  State<ActivationScreen> createState() => _ActivationScreenState();
}

class _ActivationScreenState extends State<ActivationScreen> {
  bool _activating = false;

  Future<void> _activate() async {
    setState(() => _activating = true);
    await BackgroundServiceManager().initialize();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const HomeShell()),
      (route) => false,
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
              const Icon(Icons.verified_user_outlined, size: 48, color: AppColors.success),
              const SizedBox(height: 16),
              Text('Connected as ${widget.profile.displayName}',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              const Text(
                'Once you activate monitoring, here is exactly what will happen:',
                style: TextStyle(color: AppColors.textSecondary),
              ),
              const SizedBox(height: 16),
              const _ActivationBullet(icon: Icons.location_on_outlined, text: 'Your location will be sent periodically and shown to your parent and to you.'),
              const _ActivationBullet(icon: Icons.bar_chart_outlined, text: 'App usage & screen time will be shared — you can see the same charts they do.'),
              const _ActivationBullet(icon: Icons.battery_charging_full, text: 'Battery & network status will be shared so your parent knows your device is online.'),
              const _ActivationBullet(icon: Icons.notifications_active_outlined, text: 'A permanent notification will stay visible any time monitoring is running.'),
              const Spacer(),
              if (widget.profile.rules.isNotEmpty) ...[
                Text('Active rules right now:', style: Theme.of(context).textTheme.titleSmall),
                const SizedBox(height: 8),
                ...widget.profile.rules.take(3).map(
                      (r) => Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Text('• ${r.title}', style: const TextStyle(color: AppColors.textSecondary)),
                      ),
                    ),
                const SizedBox(height: 16),
              ],
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _activating ? null : _activate,
                  child: Text(_activating ? 'Activating...' : 'Activate monitoring'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ActivationBullet extends StatelessWidget {
  final IconData icon;
  final String text;
  const _ActivationBullet({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: AppColors.gradientStart),
          const SizedBox(width: 10),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }
}
