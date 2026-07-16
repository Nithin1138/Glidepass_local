import os
import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # DesktopTheme.headlineLarge -> kHeadlineLg
    content = content.replace('DesktopTheme.headlineLarge', 'kHeadlineLg')
    content = content.replace('DesktopTheme.headlineMedium', 'kHeadlineMd')
    content = content.replace('DesktopTheme.bodyLarge', 'kBodyLg')
    content = content.replace('DesktopTheme.bodyMedium', 'kBodyMd')
    content = content.replace('DesktopTheme.labelMedium', 'kLabelMd')
    
    # Colors
    content = content.replace('DesktopTheme.primary', 'kPrimary')
    content = content.replace('DesktopTheme.secondary', 'kSecondary')
    content = content.replace('DesktopTheme.tertiary', 'kTertiary')
    content = content.replace('DesktopTheme.error', 'kError')
    content = content.replace('DesktopTheme.success', 'kSuccess')
    content = content.replace('DesktopTheme.surfaceContainer', 'kSurfaceContainer')
    content = content.replace('DesktopTheme.surfaceContainerHighest', 'kSurfaceVariant') # roughly mapping
    content = content.replace('DesktopTheme.surfaceContainerHigh', 'kSurfaceVariant')
    content = content.replace('DesktopTheme.surfaceContainerLow', 'kSurfaceLow')
    content = content.replace('DesktopTheme.surfaceContainerLowest', 'kSurfaceLowest')
    content = content.replace('DesktopTheme.surface', 'kSurface')
    content = content.replace('DesktopTheme.onSurfaceVariant', 'kOnSurfaceVariant')
    content = content.replace('DesktopTheme.onSurface', 'kOnSurface')
    content = content.replace('DesktopTheme.onPrimary', 'kSurfaceLowest') # approx
    content = content.replace('DesktopTheme.outlineVariant', 'kOutlineVariant')
    content = content.replace('DesktopTheme.outline', 'kOutlineVariant')
    
    # Also fix BoxConstraints
    content = content.replace('BoxConstraints(maxWidth: 1000)', 'BoxConstraints(maxWidth: 1000.0)')

    with open(filepath, 'w') as f:
        f.write(content)

base_dir = '/Users/nithin/Projects/GlidePass/lanpad_mobile/lib/screens/desktop/views'
for f in os.listdir(base_dir):
    if f.endswith('_view.dart'):
        fix_file(os.path.join(base_dir, f))
