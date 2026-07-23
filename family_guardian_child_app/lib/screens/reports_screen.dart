import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';

import '../models/device_status.dart';
import '../services/usage_service.dart';
import '../theme/app_theme.dart';

/// "Reports" tab — the child's own view into their usage charts, mirroring
/// what the parent dashboard renders. Nothing here is exclusive to the
/// parent's view; charts are computed from the same underlying events.
class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  final _usage = UsageService();
  bool _loading = true;
  bool _hasPermission = false;
  List<AppUsageEvent> _todayUsage = [];
  ScreenTimeEvent? _screenTime;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    _hasPermission = await _usage.hasPermission();
    if (_hasPermission) {
      final now = DateTime.now();
      final startOfDay = DateTime(now.year, now.month, now.day);
      _todayUsage = await _usage.queryUsage(start: startOfDay, end: now);
      _screenTime = await _usage.queryTodayScreenTime();
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());

    if (!_hasPermission) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.bar_chart, size: 48, color: AppColors.textSecondary),
              const SizedBox(height: 12),
              const Text(
                'Grant Usage Access to see your screen-time charts.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textSecondary),
              ),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () async {
                  await _usage.openUsageAccessSettings();
                  await _load();
                },
                child: const Text('Open settings'),
              ),
            ],
          ),
        ),
      );
    }

    final topApps = _todayUsage.take(6).toList();

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Today', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(
            _screenTime == null ? '--' : _formatHoursMinutes(_screenTime!.totalToday),
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: AppColors.gradientStart, fontWeight: FontWeight.bold),
          ),
          const Text('total screen time', style: TextStyle(color: AppColors.textSecondary)),
          const SizedBox(height: 24),
          Text('Top apps today', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 12),
          SizedBox(
            height: 220,
            child: topApps.isEmpty
                ? const Center(child: Text('No usage yet today.', style: TextStyle(color: AppColors.textSecondary)))
                : BarChart(
                    BarChartData(
                      alignment: BarChartAlignment.spaceAround,
                      maxY: (topApps.first.duration.inMinutes + 15).toDouble(),
                      titlesData: FlTitlesData(
                        leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 32)),
                        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        bottomTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            getTitlesWidget: (value, meta) {
                              final i = value.toInt();
                              if (i < 0 || i >= topApps.length) return const SizedBox.shrink();
                              final name = topApps[i].appName;
                              final short = name.length > 8 ? '${name.substring(0, 8)}…' : name;
                              return Padding(
                                padding: const EdgeInsets.only(top: 6),
                                child: Text(short, style: const TextStyle(fontSize: 10)),
                              );
                            },
                          ),
                        ),
                      ),
                      gridData: const FlGridData(show: false),
                      borderData: FlBorderData(show: false),
                      barGroups: List.generate(topApps.length, (i) {
                        return BarChartGroupData(
                          x: i,
                          barRods: [
                            BarChartRodData(
                              toY: topApps[i].duration.inMinutes.toDouble(),
                              color: AppColors.gradientStart,
                              width: 18,
                              borderRadius: BorderRadius.circular(6),
                            ),
                          ],
                        );
                      }),
                    ),
                  ),
          ),
          const SizedBox(height: 24),
          Text('Usage share', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 12),
          SizedBox(
            height: 220,
            child: topApps.isEmpty
                ? const SizedBox.shrink()
                : PieChart(
                    PieChartData(
                      sections: List.generate(topApps.length, (i) {
                        final palette = [
                          AppColors.gradientStart,
                          AppColors.gradientEnd,
                          AppColors.success,
                          AppColors.warning,
                          Colors.pinkAccent,
                          Colors.teal,
                        ];
                        return PieChartSectionData(
                          value: topApps[i].duration.inMinutes.toDouble(),
                          title: '',
                          color: palette[i % palette.length],
                          radius: 60,
                        );
                      }),
                      sectionsSpace: 2,
                      centerSpaceRadius: 40,
                    ),
                  ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 8,
            children: List.generate(topApps.length, (i) {
              final palette = [
                AppColors.gradientStart,
                AppColors.gradientEnd,
                AppColors.success,
                AppColors.warning,
                Colors.pinkAccent,
                Colors.teal,
              ];
              return Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(width: 10, height: 10, color: palette[i % palette.length]),
                  const SizedBox(width: 6),
                  Text(topApps[i].appName, style: const TextStyle(fontSize: 12)),
                ],
              );
            }),
          ),
        ],
      ),
    );
  }

  String _formatHoursMinutes(Duration d) {
    final h = d.inHours;
    final m = d.inMinutes % 60;
    return '${h}h ${m}m';
  }
}
