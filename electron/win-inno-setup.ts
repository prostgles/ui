import * as fs from "fs";
import pkg from "./package.json";

export const make = () => {
  const packed = `${__dirname}\\..\\packed`;
  const folders = fs.readdirSync(packed);
  const packedFolder = folders.find((d) => d.includes("prostgles-desktop"));
  if (packedFolder) {
    const buildDir = `${packed}\\${packedFolder}`;

    /** Move all packed root folders to Data */
    const dataDir = `${buildDir}/Data`;
    fs.mkdirSync(dataDir);

    const otherFolders = fs.readdirSync(buildDir, { withFileTypes: true });
    otherFolders.forEach((f) => {
      if (f.isDirectory() && f.name !== "Data") {
        fs.renameSync(`${buildDir}/${f.name}/`, `${dataDir}/${f.name}/`);
      }
    });

    const buildDirFiles = fs.readdirSync(buildDir, { withFileTypes: true });
    fs.writeFileSync(
      `${packed}\\inno.iss`,
      getInnoConfig(buildDirFiles, buildDir),
      { encoding: "utf8" },
    );
  }
};

function getInnoConfig(rootFiles: fs.Dirent[], rootLocationWin: string) {
  return `

#define MyAppName "Prostgles Desktop"
#define MyAppVersion ${JSON.stringify(pkg.version)}
#define MyAppPublisher ${JSON.stringify(pkg.author)}
#define MyAppURL ${JSON.stringify(pkg.homepage)}
#define MyAppExeName ${JSON.stringify(pkg.name + ".exe")}
#define MyAppSetupName ${JSON.stringify([pkg.name, pkg.version, "amd64", "setup"].join("_"))}

#define MyAppAssocName MyAppName + " File"
#define MyAppAssocExt ".sql"
#define MyAppAssocKey StringChange(MyAppAssocName, " ", "") + MyAppAssocExt

[Setup]
; NOTE: The value of AppId uniquely identifies this application. Do not use the same AppId value in installers for other applications.
; (To generate a new GUID, click Tools | Generate GUID inside the IDE.)
AppId={{AF473B76-6E5B-4A5C-9BB9-87B808EFA451}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
;AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\\{#MyAppName}
ChangesAssociations=yes
DisableProgramGroupPage=yes
; Uncomment the following line to run in non administrative install mode (install for current user only.)
;PrivilegesRequired=lowest

OutputBaseFilename={#MyAppSetupName}
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "${rootLocationWin}\\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
${rootFiles
  .filter((f) => !f.name.endsWith(".exe") && f.name !== "Data")
  .map((f) => {
    return `Source: "${rootLocationWin}\\${f.name}"; DestDir: "{app}"; Flags: ignoreversion`;
  })
  .join(" \n")}
Source: "${rootLocationWin}\\Data\\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs ; Permissions: everyone-full
; NOTE: Don't use "Flags: ignoreversion" on any shared system files


[Registry]
Root: HKA; Subkey: "Software\\Classes\\{#MyAppAssocExt}\\OpenWithProgids"; ValueType: string; ValueName: "{#MyAppAssocKey}"; ValueData: ""; Flags: uninsdeletevalue
Root: HKA; Subkey: "Software\\Classes\\{#MyAppAssocKey}"; ValueType: string; ValueName: ""; ValueData: "{#MyAppAssocName}"; Flags: uninsdeletekey
Root: HKA; Subkey: "Software\\Classes\\{#MyAppAssocKey}\\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\\{#MyAppExeName},0"
Root: HKA; Subkey: "Software\\Classes\\{#MyAppAssocKey}\\shell\\open\\command"; ValueType: string; ValueName: ""; ValueData: """{app}\\{#MyAppExeName}"" ""%1"""
Root: HKA; Subkey: "Software\\Classes\\Applications\\{#MyAppExeName}\\SupportedTypes"; ValueType: string; ValueName: ".sql"; ValueData: ""

[Icons]
Name: "{autoprograms}\\{#MyAppName}"; Filename: "{app}\\{#MyAppExeName}"
Name: "{autodesktop}\\{#MyAppName}"; Filename: "{app}\\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

`;
}
