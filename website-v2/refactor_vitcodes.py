import re
import sys

def process_file(filename):
    with open(filename, 'r') as f:
        content = f.read()

    # Find the imports and inject the theme context state if not present
    if 'const [theme, setTheme] = useState' not in content:
        # For vitcodes/page.tsx, it's a Server Component if it doesn't have "use client"
        # We need to make sure "use client" is present
        if '"use client"' not in content:
            content = '"use client";\n' + content
        
        if 'useState' not in content:
            content = content.replace('import React', 'import React, { useState }')
            if 'import React' not in content:
                content = 'import React, { useState } from "react";\n' + content

        # Inject P and theme state inside the main export default function
        component_pattern = r"(export default function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{)"
        component_replacement = r"""\1
  const [theme, setTheme] = useState("dark");
  const dk = theme === "dark";

  const P = {
    white: "#FAFAFA",
    sky: "#C7EEFF",
    blue: "#0077C0",
    black: "#050505",
    error: "#C62828"
  };
"""
        content = re.sub(component_pattern, component_replacement, content)

    # Replace classes
    def classname_replacer(match):
        cls = match.group(1)
        if any(c in cls for c in ['text-white', 'text-black', 'bg-black', 'bg-[#050505]', 'bg-[#111]', 'border-white', 'indigo-', 'rose-']):
            cls = cls.replace('indigo-', 'blue-')
            cls = cls.replace('rose-', 'sky-')
            
            cls = re.sub(r'\btext-white\b', '${dk ? "text-white" : "text-black"}', cls)
            cls = re.sub(r'\btext-white/(\d+)\b', r'${dk ? "text-white/\1" : "text-black/\1"}', cls)
            
            cls = re.sub(r'\bbg-black\b', '${dk ? "bg-black" : "bg-white"}', cls)
            cls = re.sub(r'\bbg-\[\#050505\]\b', '${dk ? "bg-[#050505]" : "bg-[#FAFAFA]"}', cls)
            cls = re.sub(r'\bbg-\[\#111\]\b', '${dk ? "bg-[#111]" : "bg-gray-100"}', cls)
            
            cls = re.sub(r'\bborder-white/(\d+)\b', r'${dk ? "border-white/\1" : "border-black/\1"}', cls)
            
            return f'className={{`{cls}`}}'
        return match.group(0)

    content = re.sub(r'className="([^"]+)"', classname_replacer, content)

    with open(filename, 'w') as f:
        f.write(content)

process_file('src/app/vitcodes/page.tsx')
process_file('src/app/vitcodes/[id]/page.tsx')
print("Refactored vitcodes pages")
