#define MyAppName "LANpad"
#define MyAppVersion "1.4.1"
#define MyAppPublisher "GlidePass"
#define MyAppURL "https://github.com/Nithin1138/Glidepass_local"
#define MyAppExeName "lanpad.exe"
#define SourceDir "..\..\lanpad_mobile\build\windows\x64\runner\Release"

[Setup]
AppId={{C7853E6D-3186-4FCE-8F4C-9781B8AE244B}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={localappdata}\Programs\{#MyAppName}
DisableProgramGroupPage=yes
OutputDir=..\..\
OutputBaseFilename=LANpad-Setup
SetupIconFile=..\..\lanpad_mobile\windows\runner\resources\app_icon.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
CloseApplications=force
RestartApplications=no
VersionInfoVersion=1.4.1.0
VersionInfoCompany=LANpad
VersionInfoDescription=LANpad Desktop Controller & LAN Utility
VersionInfoTextVersion=1.4.1
VersionInfoCopyright=Copyright (C) 2026 LANpad
VersionInfoProductName=LANpad
VersionInfoProductVersion=1.4.1.0

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Code]
function InitializeSetup(): Boolean;
var
  ErrorCode: Integer;
begin
  // Forcefully terminate any running instance of lanpad before extracting files
  ShellExec('open', 'taskkill.exe', '/F /IM lanpad.exe /T', '', SW_HIDE, ewWaitUntilTerminated, ErrorCode);
  Result := True;
end;
