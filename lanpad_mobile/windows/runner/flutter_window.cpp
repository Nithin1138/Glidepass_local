#include "flutter_window.h"

#include <optional>
#include <vector>
#include <string>
#include <flutter/method_channel.h>
#include <flutter/standard_method_codec.h>

#include "flutter/generated_plugin_registrant.h"

FlutterWindow::FlutterWindow(const flutter::DartProject& project)
    : project_(project) {}

FlutterWindow::~FlutterWindow() {}

bool FlutterWindow::OnCreate() {
  if (!Win32Window::OnCreate()) {
    return false;
  }

  RECT frame = GetClientArea();

  // The size here must match the window dimensions to avoid unnecessary surface
  // creation / destruction in the startup path.
  flutter_controller_ = std::make_unique<flutter::FlutterViewController>(
      frame.right - frame.left, frame.bottom - frame.top, project_);
  // Ensure that basic setup of the controller was successful.
  if (!flutter_controller_->engine() || !flutter_controller_->view()) {
    return false;
  }
  RegisterPlugins(flutter_controller_->engine());

  // Setup platform channel for keyboard input simulation
  auto channel = std::make_unique<flutter::MethodChannel<>>(
      flutter_controller_->engine()->messenger(), "lanpad/system",
      &flutter::StandardMethodCodec::GetInstance());

  channel->SetMethodCallHandler(
      [](const flutter::MethodCall<>& call,
         std::unique_ptr<flutter::MethodResult<>> result) {
        if (call.method() == "simulateTyping") {
          const auto* arguments = std::get_if<flutter::EncodableMap>(call.arguments());
          std::string text = "";
          if (arguments) {
            auto text_it = arguments->find(flutter::EncodableValue("text"));
            if (text_it != arguments->end()) {
              text = std::get<std::string>(text_it->second);
            }
          }
          if (!text.empty()) {
            int len = MultiByteToWideChar(CP_UTF8, 0, text.c_str(), -1, nullptr, 0);
            std::vector<wchar_t> wtext(len);
            MultiByteToWideChar(CP_UTF8, 0, text.c_str(), -1, wtext.data(), len);
            for (wchar_t wc : wtext) {
              if (wc == L'\0') continue;
              INPUT input[2] = {};
              input[0].type = INPUT_KEYBOARD;
              input[0].ki.wScan = wc;
              input[0].ki.dwFlags = KEYEVENTF_UNICODE;
              
              input[1].type = INPUT_KEYBOARD;
              input[1].ki.wScan = wc;
              input[1].ki.dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP;
              
              SendInput(2, input, sizeof(INPUT));
              Sleep(5);
            }
          }
          result->Success(flutter::EncodableValue("success"));
        } else {
          result->NotImplemented();
        }
      });

  // Keep channel handler alive by moving ownership or keeping reference
  // (MethodChannel registers itself automatically in binary messenger)

  SetChildContent(flutter_controller_->view()->GetNativeWindow());

  flutter_controller_->engine()->SetNextFrameCallback([&]() {
    this->Show();
  });

  // Flutter can complete the first frame before the "show window" callback is
  // registered. The following call ensures a frame is pending to ensure the
  // window is shown. It is a no-op if the first frame hasn't completed yet.
  flutter_controller_->ForceRedraw();

  return true;
}

void FlutterWindow::OnDestroy() {
  if (flutter_controller_) {
    flutter_controller_ = nullptr;
  }

  Win32Window::OnDestroy();
}

LRESULT
FlutterWindow::MessageHandler(HWND hwnd, UINT const message,
                              WPARAM const wparam,
                              LPARAM const lparam) noexcept {
  // Give Flutter, including plugins, an opportunity to handle window messages.
  if (flutter_controller_) {
    std::optional<LRESULT> result =
        flutter_controller_->HandleTopLevelWindowProc(hwnd, message, wparam,
                                                      lparam);
    if (result) {
      return *result;
    }
  }

  switch (message) {
    case WM_FONTCHANGE:
      flutter_controller_->engine()->ReloadSystemFonts();
      break;
  }

  return Win32Window::MessageHandler(hwnd, message, wparam, lparam);
}
