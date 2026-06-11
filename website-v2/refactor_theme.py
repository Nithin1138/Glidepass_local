import re
import sys

def process_file(filename):
    with open(filename, 'r') as f:
        content = f.read()

    # We need to inject Context at the top
    context_code = """
import React, { createContext, useContext } from "react";
const ThemeContext = createContext({ dk: true, setTheme: (t: string) => {} });
const useTheme = () => useContext(ThemeContext);

const P = {
  white: "#FAFAFA",
  sky: "#C7EEFF",
  blue: "#0077C0",
  black: "#050505",
  error: "#C62828"
};
"""
    # Find the imports and inject the context right after
    import_end = content.find('import Link from "next/link";') + len('import Link from "next/link";')
    content = content[:import_end] + "\n" + context_code + content[import_end:]

    # For each component definition, we need to inject `const { dk } = useTheme();`
    components = ['CursorSpotlight', 'BackgroundOrbs', 'Navbar', 'Hero', 'Features', 'Downloads', 'SetupGuide', 'Footer']
    for comp in components:
        # Match `const Comp = (...) => {`
        pattern = r"(const\s+" + comp + r"\s*=\s*\([^)]*\)\s*=>\s*\{)"
        replacement = r"\1\n  const { dk } = useTheme();"
        content = re.sub(pattern, replacement, content)

    # Now, let's wrap all className=".*?" with template literals if they contain colors to be replaced
    # We will do this carefully using a regex that finds className="<string>"
    def classname_replacer(match):
        cls = match.group(1)
        if any(c in cls for c in ['text-white', 'text-black', 'bg-black', 'bg-[#050505]', 'bg-[#111]', 'border-white', 'indigo-', 'rose-']):
            # Replace indigo- with blue- and rose- with sky-
            cls = cls.replace('indigo-', 'blue-')
            cls = cls.replace('rose-', 'sky-')
            
            # Now handle dark/light
            # text-white -> ${dk ? "text-white" : "text-black"}
            cls = re.sub(r'\btext-white\b', '${dk ? "text-white" : "text-black"}', cls)
            cls = re.sub(r'\btext-white/(\d+)\b', r'${dk ? "text-white/\1" : "text-black/\1"}', cls)
            
            cls = re.sub(r'\bbg-black\b', '${dk ? "bg-black" : "bg-white"}', cls)
            cls = re.sub(r'\bbg-\[\#050505\]\b', '${dk ? "bg-[#050505]" : "bg-[#FAFAFA]"}', cls)
            cls = re.sub(r'\bbg-\[\#111\]\b', '${dk ? "bg-[#111]" : "bg-gray-100"}', cls)
            
            cls = re.sub(r'\bborder-white/(\d+)\b', r'${dk ? "border-white/\1" : "border-black/\1"}', cls)
            
            return f'className={{`{cls}`}}'
        return match.group(0)

    content = re.sub(r'className="([^"]+)"', classname_replacer, content)

    # Finally, rewrite LandingPage to Provide the context
    landing_pattern = r"export default function LandingPage\(\)\s*\{"
    landing_replacement = """export default function LandingPage() {
  const [theme, setTheme] = useState("dark");
  const dk = theme === "dark";
"""
    content = re.sub(landing_pattern, landing_replacement, content)
    
    # We need to wrap the return of LandingPage with <ThemeContext.Provider>
    return_pattern = r"(return\s*\(\s*)(<main[^>]*>)"
    return_replacement = r"\1<ThemeContext.Provider value={{ dk, setTheme }}>\n      \2"
    content = re.sub(return_pattern, return_replacement, content)
    
    # And close the provider
    end_main_pattern = r"(</main>\s*\);\s*\})"
    end_main_replacement = r"\1".replace("</main>", "</main>\n    </ThemeContext.Provider>") # hacky but works
    # Wait, simpler: replace the last `</main>\n  );`
    content = content.replace("</main>\n  );", "</main>\n    </ThemeContext.Provider>\n  );")

    with open(filename, 'w') as f:
        f.write(content)

process_file('src/app/page.tsx')
print("Refactored page.tsx")
