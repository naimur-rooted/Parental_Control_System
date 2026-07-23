import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/device_status.dart';
import '../theme/app_theme.dart';

/// Persistent header shown at the top of every tab: battery, network,
/// and last-sync time — the "what's being shared, right now" summary.
class StatusHeader extends StatelessWidget {
  final DeviceStatus status;
  final DateTime? lastSync;
  final bool monitoringActive;

  const StatusHeader({
    super.key,
    required this.status,
    required this.lastSync,
    required this.monitoringActive,
  });

  @override
  Widget build(BuildContext context) {
    final lastSyncText = lastSync == null
        ? 'Never synced yet'
        : 'Last sync ${DateFormat('MMM d, h:mm a').format(lastSync!)}';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Row(
            children: [
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  color: monitoringActive ? AppColors.success : AppColors.warning,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                monitoringActive ? 'Monitoring active' : 'Monitoring paused',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              const Spacer(),
              _MiniStat(
                icon: status.batteryPercent != null && status.batteryPercent! < 20
                    ? Icons.battery_alert
                    : Icons.battery_std,
                label: status.batteryPercent != null ? '${status.batteryPercent}%' : '--',
              ),
              const SizedBox(width: 12),
              _MiniStat(
                icon: status.networkType == 'wifi' ? Icons.wifi : Icons.signal_cellular_alt,
                label: status.networkType ?? 'unknown',
              ),
            ],
          ),
        ),
        const SizedBox(height: 4),
        Padding(
          padding: const EdgeInsets.only(left: 4),
          child: Text(lastSyncText, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
        ),
      ],
    );
  }
}

class _MiniStat extends StatelessWidget {
  final IconData icon;
  final String label;
  const _MiniStat({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 16, color: AppColors.textSecondary),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
      ],
    );
  }
}
