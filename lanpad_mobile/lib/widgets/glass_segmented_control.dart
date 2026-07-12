import 'package:flutter/material.dart';
import 'liquid_glass_card.dart';
import '../config/theme.dart';

/// Segmented selector with a smooth horizontal sliding pill indicator.
class GlassSegmentedControl extends StatelessWidget {
  final List<GlassSegment> segments;
  final int selectedIndex;
  final ValueChanged<int> onChanged;

  const GlassSegmentedControl({
    super.key,
    required this.segments,
    required this.selectedIndex,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return LiquidGlassCard(
      borderRadius: 100, // full pill
      padding: const EdgeInsets.all(4),
      blur: 20,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final double totalWidth = constraints.maxWidth;
          final double segmentWidth = totalWidth / segments.length;

          return Stack(
            children: [
              // Sliding background pill indicator
              AnimatedPositioned(
                duration: const Duration(milliseconds: 260),
                curve: Curves.easeOutCubic,
                left: selectedIndex * segmentWidth,
                width: segmentWidth,
                top: 0,
                bottom: 0,
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(100),
                    color: context.isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.05),
                    border: Border.all(color: context.borderColor, width: 1),
                  ),
                ),
              ),

              // Foreground tab items
              Row(
                mainAxisSize: MainAxisSize.max,
                children: List.generate(segments.length, (i) {
                  final selected = i == selectedIndex;
                  final seg = segments[i];
                  return Expanded(
                    child: GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: () => onChanged(i),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              seg.icon,
                              size: 16,
                              color: selected
                                  ? context.textMain
                                  : context.textMuted,
                            ),
                            const SizedBox(width: 6),
                            Flexible(
                              child: Text(
                                seg.label,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                                  color: selected
                                      ? context.textMain
                                      : context.textMuted,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ],
          );
        },
      ),
    );
  }
}

class GlassSegment {
  final String label;
  final IconData icon;
  const GlassSegment({required this.label, required this.icon});
}
