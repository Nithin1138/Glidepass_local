import os
import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Map the remaining ones
    content = content.replace('kSurfaceContainerHigh', 'kSurfaceVariant')
    content = content.replace('kSurfaceContainerHighest', 'kSurfaceVariant')
    content = content.replace('kSurfaceContainerLow', 'kSurfaceLow')
    content = content.replace('kSurfaceContainerLowest', 'kSurfaceLowest')

    # Wait, kSurfaceContainerHighest -> kSurfaceVariant (it would become kSurfaceVariantest if I replaced High first, so replace Highest first!)
    # Actually, in the last script I already replaced them!
    # Ah, the first script:
    # content = content.replace('DesktopTheme.surfaceContainerHighest', 'kSurfaceVariant') 
    # But some had kSurfaceContainerHigh directly or something?
    # No, they were undefined because the python script replaced:
    # DesktopTheme.surfaceContainerHigh -> kSurfaceContainerHigh  (Wait, I didn't map it properly in the script?)
    pass

base_dir = '/Users/nithin/Projects/GlidePass/lanpad_mobile/lib/screens/desktop/views'
for f in os.listdir(base_dir):
    if f.endswith('_view.dart'):
        with open(os.path.join(base_dir, f), 'r') as file:
            content = file.read()
        
        content = content.replace('kSurfaceContainerHighest', 'kSurfaceVariant')
        content = content.replace('kSurfaceContainerHigh', 'kSurfaceVariant')
        
        with open(os.path.join(base_dir, f), 'w') as file:
            file.write(content)
