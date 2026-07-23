import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class SidebarItem {
  final IconData icon;
  final String label;
  const SidebarItem(this.icon, this.label);
}

/// Mirrors the web dashboard's gradient sidebar. On mobile we render it as
/// a slim vertical rail (used on tablets/landscape) or a bottom nav bar on
/// phones — see HomeShell for the breakpoint logic.
class GradientSidebar extends StatelessWidget {
  final List<SidebarItem> items;
  final int currentIndex;
  final ValueChanged<int> onTap;

  const GradientSidebar({
    super.key,
    required this.items,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 88,
      decoration: const BoxDecoration(gradient: AppColors.sidebarGradient),
      child: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 24),
            const Icon(Icons.shield_moon_rounded, color: Colors.white, size: 32),
            const SizedBox(height: 24),
            Expanded(
              child: ListView.builder(
                itemCount: items.length,
                itemBuilder: (context, index) {
                  final selected = index == currentIndex;
                  final item = items[index];
                  return InkWell(
                    onTap: () => onTap(index),
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: selected ? Colors.white.withOpacity(0.18) : Colors.transparent,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Column(
                        children: [
                          Icon(item.icon, color: Colors.white, size: 22),
                          const SizedBox(height: 4),
                          Text(
                            item.label,
                            style: const TextStyle(color: Colors.white, fontSize: 10),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Bottom nav bar variant for narrow (phone) layouts, same gradient theme.
class GradientBottomNav extends StatelessWidget {
  final List<SidebarItem> items;
  final int currentIndex;
  final ValueChanged<int> onTap;

  const GradientBottomNav({
    super.key,
    required this.items,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(gradient: AppColors.sidebarGradient),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 64,
          child: Row(
            children: List.generate(items.length, (index) {
              final selected = index == currentIndex;
              final item = items[index];
              return Expanded(
                child: InkWell(
                  onTap: () => onTap(index),
                  child: Container(
                    margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                    decoration: BoxDecoration(
                      color: selected ? Colors.white.withOpacity(0.18) : Colors.transparent,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(item.icon, color: Colors.white, size: 20),
                        const SizedBox(height: 2),
                        Text(item.label, style: const TextStyle(color: Colors.white, fontSize: 10)),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}
