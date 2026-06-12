import sys

with open("launcher.py", "r") as f:
    content = f.read()

# Add self.show_window() at the end of toggle_server
old_toggle = """    def toggle_server(self):
        if self.process is None:
            self.start_server()
        else:
            self.stop_server()"""

new_toggle = """    def toggle_server(self):
        if self.process is None:
            self.start_server()
        else:
            self.stop_server()
        # Force the window to stay visible in case macOS attempts to hide it
        self.root.after(100, self.show_window)"""

content = content.replace(old_toggle, new_toggle)

with open("launcher.py", "w") as f:
    f.write(content)

print("Patched launcher.py")
