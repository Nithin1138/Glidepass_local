import rumps

class TestApp(rumps.App):
    def __init__(self):
        super(TestApp, self).__init__("Test", quit_button=None)
        self.menu = ["Option 1", "Quit Test App"]

    @rumps.clicked("Quit Test App")
    def on_quit(self, _):
        print("Quitting cleanly!")
        rumps.quit_application()

if __name__ == "__main__":
    TestApp().run()
