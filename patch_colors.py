import os

# Update launcher.py
path_launcher = "/Users/nithin/Projects/LANpad/launcher.py"
with open(path_launcher, "r") as f:
    l_data = f.read()

new_tokens = """        self.BG     = "#031734" # Navy background
        self.BG2    = "#0b2e59" # Elevated navy
        self.AMBER  = "#2a629e" # Medium blue
        self.ORANGE = "#4691d7" # Bright blue
        self.RED    = "#ff453a"
        self.GREEN  = "#4691d7" # Also bright blue for accents
        self.WHITE  = "#ffffff"
        self.DIM    = "#80a4c9"
        self.BORDER = "#14457b" # Border blue"""

l_data = l_data.replace(
    '        self.BG     = "#1c1c1e" # Apple background\n        self.BG2    = "#2c2c2e" # Apple elevated\n        self.AMBER  = "#0a84ff"\n        self.ORANGE  = "#0a84ff"\n        self.RED    = "#ff453a"\n        self.GREEN  = "#32d74b"\n        self.WHITE  = "#ffffff"\n        self.DIM    = "#8e8e93"\n        self.BORDER = "#3a3a3c"',
    new_tokens
)
# Just in case the spaces didn't match perfectly, let's use replace manually line by line
l_data = l_data.replace('self.BG     = "#1c1c1e" # Apple background', 'self.BG     = "#031734" # Navy background')
l_data = l_data.replace('self.BG2    = "#2c2c2e" # Apple elevated', 'self.BG2    = "#0b2e59" # Elevated navy')
l_data = l_data.replace('self.AMBER  = "#0a84ff"', 'self.AMBER  = "#2a629e"')
l_data = l_data.replace('self.ORANGE = "#0a84ff"', 'self.ORANGE = "#4691d7"')
l_data = l_data.replace('self.GREEN  = "#32d74b"', 'self.GREEN  = "#4691d7"')
l_data = l_data.replace('self.DIM    = "#8e8e93"', 'self.DIM    = "#80a4c9"')
l_data = l_data.replace('self.BORDER = "#3a3a3c"', 'self.BORDER = "#14457b"')

with open(path_launcher, "w") as f:
    f.write(l_data)


# Update templates/index.html
path_html = "/Users/nithin/Projects/LANpad/templates/index.html"
with open(path_html, "r") as f:
    h_data = f.read()

# Replace CSS variables
h_old_css = """        :root {
            --bg-color: #080808;
            --card-bg: #121212;
            --border-color: #222;
            --text-main: #fff;
            --text-muted: #666;
            --accent-color: #f59e0b;
            --accent-glow: rgba(245, 158, 11, 0.2);
            --red-status: #ff4d4d;
            --green-status: #4ade80;
            --font-main: 'Inter', -apple-system, sans-serif;
        }"""

h_new_css = """        :root {
            --bg-color: #031734;
            --card-bg: #0b2e59;
            --border-color: #14457b;
            --text-main: #ffffff;
            --text-muted: #80a4c9;
            --accent-color: #4691d7;
            --accent-glow: rgba(70, 145, 215, 0.3);
            --red-status: #ff4d4d;
            --green-status: #4691d7;
            --font-main: 'Inter', -apple-system, sans-serif;
        }"""
h_data = h_data.replace(h_old_css, h_new_css)

# Update hardcoded colors
h_data = h_data.replace("background: #0d0d0d;", "background: var(--card-bg);")
h_data = h_data.replace("background: #111;", "background: var(--card-bg);")
h_data = h_data.replace("background: #1a0f0f;", "background: #14457b;")
h_data = h_data.replace("background: #1a1a1a;", "background: #2a629e;")
h_data = h_data.replace("border-color: #444;", "border-color: var(--accent-color);")
h_data = h_data.replace("color: #444;", "color: var(--border-color);")
h_data = h_data.replace("border: 1px solid #331a1a;", "border: 1px solid var(--border-color);")
h_data = h_data.replace("background: #000;", "background: var(--bg-color);")

# Claymorphism error for toast
toast_old = """        .toast {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: #222;
            color: #fff;
            padding: 10px 20px;
            border-radius: 30px;
            font-size: 0.9rem;
            opacity: 0;
            transition: opacity 0.3s;
            pointer-events: none;
            z-index: 1000;
        }"""

toast_new = """        .toast {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: #ff4d4d; /* Base red for claymorphic error */
            color: #ffffff;
            padding: 14px 28px;
            border-radius: 30px;
            font-size: 0.95rem;
            font-weight: 800;
            opacity: 0;
            transition: opacity 0.3s, transform 0.3s;
            pointer-events: none;
            z-index: 1000;
            border: none;
            /* Claymorphic 3D shadow effect */
            box-shadow: 
                6px 6px 12px rgba(0, 0, 0, 0.4), 
                -2px -2px 8px rgba(255, 255, 255, 0.05), 
                inset 4px 4px 10px rgba(255, 255, 255, 0.4), 
                inset -4px -4px 10px rgba(0, 0, 0, 0.2); 
        }
        .toast.success {
            background: #4691d7; /* Blue for success */
        }"""

h_data = h_data.replace(toast_old, toast_new)

# Update showToast logic
toast_logic_old = """        function showToast(msg) {
            const toast = document.getElementById('toast');
            toast.textContent = msg;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 2000);
        }"""

toast_logic_new = """        function showToast(msg, type='success') {
            const toast = document.getElementById('toast');
            toast.textContent = msg;
            toast.className = 'toast show ' + type;
            // Add a little pop animation
            toast.style.transform = 'translateX(-50%) scale(1.05)';
            setTimeout(() => toast.style.transform = 'translateX(-50%) scale(1)', 150);
            setTimeout(() => {
                toast.classList.remove('show');
                toast.style.transform = 'translateX(-50%)';
            }, 2500);
        }"""

h_data = h_data.replace(toast_logic_old, toast_logic_new)

# Change toast calls to indicate error when appropriate
h_data = h_data.replace("showToast('Error Connecting');", "showToast('Error Connecting', 'error');")
h_data = h_data.replace("showToast('Fetch Failed');", "showToast('Fetch Failed', 'error');")
h_data = h_data.replace("showToast('Capture Failed');", "showToast('Capture Failed', 'error');")
h_data = h_data.replace("showToast('Failed to Stop');", "showToast('Failed to Stop', 'error');")

with open(path_html, "w") as f:
    f.write(h_data)

print("Updated palette and claymorphic error successfully.")
