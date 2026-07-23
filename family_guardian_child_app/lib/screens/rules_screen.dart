import 'package:flutter/material.dart';

import '../models/child_profile.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

/// "Rules" tab — fetches /api/public/child/me and shows the currently
/// active rules in plain language, e.g. "No gaming after 10 PM".
class RulesScreen extends StatefulWidget {
  const RulesScreen({super.key});

  @override
  State<RulesScreen> createState() => _RulesScreenState();
}

class _RulesScreenState extends State<RulesScreen> {
  final _api = ApiService();
  ChildProfile? _profile;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final profile = await _api.fetchChildProfile();
      setState(() => _profile = profile);
    } catch (e) {
      setState(() => _error = 'Could not load rules. Pull to refresh to try again.');
    } finally {
      setState(() => _loading = false);
    }
  }

  IconData _iconForCategory(String? category) {
    switch (category) {
      case 'gaming':
        return Icons.sports_esports_outlined;
      case 'social':
        return Icons.forum_outlined;
      case 'bedtime':
        return Icons.bedtime_outlined;
      case 'screen_time':
        return Icons.hourglass_bottom_outlined;
      default:
        return Icons.rule_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Active rules', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          const Text(
            'Set by your parent on the family dashboard. These are the same rules they see.',
            style: TextStyle(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 16),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Text(_error!, style: const TextStyle(color: AppColors.danger)),
            ),
          if (_profile != null && _profile!.rules.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: Text('No active rules right now.', style: TextStyle(color: AppColors.textSecondary)),
              ),
            ),
          if (_profile != null)
            ..._profile!.rules.map(
              (rule) => Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: AppColors.gradientStart.withOpacity(0.1),
                    child: Icon(_iconForCategory(rule.category), color: AppColors.gradientStart),
                  ),
                  title: Text(rule.title, style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: rule.description.isNotEmpty ? Text(rule.description) : null,
                  trailing: rule.active
                      ? const Icon(Icons.check_circle, color: AppColors.success, size: 20)
                      : const Icon(Icons.pause_circle_outline, color: AppColors.textSecondary, size: 20),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
