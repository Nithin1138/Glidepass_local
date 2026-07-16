import os
import re

base_dir = '/Users/nithin/Projects/GlidePass/lanpad_mobile/lib/screens/desktop/views'
for f in os.listdir(base_dir):
    if f.endswith('_view.dart'):
        with open(os.path.join(base_dir, f), 'r') as file:
            content = file.read()
        
        content = content.replace('kSurfaceContainerLowest', 'kSurfaceLowest')
        content = content.replace('kSurfaceContainerLow', 'kSurfaceLow')
        
        with open(os.path.join(base_dir, f), 'w') as file:
            file.write(content)
