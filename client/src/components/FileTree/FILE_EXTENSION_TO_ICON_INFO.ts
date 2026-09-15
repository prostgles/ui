import { fromEntries } from "@common/utils";
import {
  mdiApplicationCog,
  mdiArchive,
  mdiBash,
  mdiBrain,
  mdiCertificate,
  mdiCodeJson,
  mdiDatabase,
  mdiDisc,
  mdiDocker,
  mdiFileDocumentOutline,
  mdiFileExcel,
  mdiFileMusic,
  mdiFilePdfBox,
  mdiFilePowerpoint,
  mdiImage,
  mdiLanguageC,
  mdiLanguageCpp,
  mdiLanguageCsharp,
  mdiLanguageCss3,
  mdiLanguageFortran,
  mdiLanguageGo,
  mdiLanguageHtml5,
  mdiLanguageJavascript,
  mdiLanguagePhp,
  mdiLanguagePython,
  mdiLanguageR,
  mdiLanguageRuby,
  mdiLanguageRust,
  mdiLanguageSwift,
  mdiLanguageTypescript,
  mdiMicrosoftVisualStudio,
  mdiMicrosoftWindows,
  mdiMicrosoftWord,
  mdiPackage,
  mdiPackageVariantClosed,
  mdiPound,
  mdiReact,
  mdiScript,
  mdiSignature,
  mdiSvg,
  mdiTableLarge,
  mdiVideo,
} from "@mdi/js";
export const FILE_EXTENSION_TO_ICON_INFO: Record<
  string,
  { label: string; iconPath?: string; color?: string }
> = {
  /** Frontend / web tooling */
  ts: {
    iconPath: mdiLanguageTypescript,
    label: "typescript",
    color: "#3178c6",
  },
  ".spec.ts": {
    iconPath: mdiLanguageTypescript,
    label: "typescript",
    color: "#d97605",
  },
  mjs: { iconPath: mdiReact, label: "javascript", color: "#cbb60b" },
  cjs: { iconPath: mdiReact, label: "javascript", color: "#cbb60b" },
  jsx: { iconPath: mdiReact, label: "javascript", color: "#34bee4" },
  tsx: { iconPath: mdiReact, label: "typescript", color: "#34bee4" },
  js: {
    iconPath: mdiLanguageJavascript,
    label: "javascript",
    color: "#cbb60b",
  },
  css: { iconPath: mdiLanguageCss3, label: "css", color: "#1572b6" },
  html: { label: "html", iconPath: mdiLanguageHtml5, color: "#e34f26" },
  scss: { iconPath: mdiPound, label: "scss", color: "#cf649a" },
  sass: { iconPath: mdiPound, label: "sass", color: "#cf649a" },
  less: { iconPath: mdiPound, label: "less", color: "#1d365d" },
  vue: { iconPath: mdiReact, label: "vue", color: "#42b883" },
  svelte: { iconPath: mdiReact, label: "svelte", color: "#ff3e00" },
  astro: { iconPath: mdiReact, label: "astro", color: "#ff5d01" },

  gql: { iconPath: mdiCodeJson, label: "graphql", color: "#e10098" },
  graphql: { iconPath: mdiCodeJson, label: "graphql", color: "#e10098" },
  proto: {
    iconPath: mdiFileDocumentOutline,
    label: "protobuf",
    color: "#4285f4",
  },
  wasm: {
    iconPath: mdiApplicationCog,
    label: "webassembly",
    color: "#654ff0",
  },

  py: { iconPath: mdiLanguagePython, label: "python", color: "#3776ab" },
  rb: { iconPath: mdiLanguageRuby, label: "ruby", color: "#cc342d" },
  go: { iconPath: mdiLanguageGo, label: "go", color: "#00add8" },

  sh: { iconPath: mdiBash, label: "shell", color: "#4fa816" },
  bash: { iconPath: mdiBash, label: "shell", color: "#4fa816" },
  zsh: { iconPath: mdiBash, label: "shell", color: "#4fa816" },
  fish: { iconPath: mdiBash, label: "shell", color: "#4fa816" },

  yaml: { label: "yaml", color: "#cb171e" },
  yml: { label: "yaml", color: "#cb171e" },
  toml: { label: "toml", color: "#9c4221" },
  ini: { label: "ini", color: "#6b7280" },
  conf: { label: "config", color: "#6b7280" },
  cfg: { label: "config", color: "#6b7280" },
  env: { label: "env", color: "#6b7280" },

  sql: { label: "sql", color: "#336791" },

  json: { iconPath: mdiCodeJson, label: "json", color: "#c69b19" },
  txt: {
    label: "plaintext",
    iconPath: mdiFileDocumentOutline,
    color: "#717171",
  },
  log: { label: "log" },

  csv: { iconPath: mdiTableLarge, label: "csv", color: "#217346" },
  tsv: { iconPath: mdiTableLarge, label: "tsv", color: "#217346" },

  dockerfile: { iconPath: mdiDocker, label: "dockerfile", color: "#2496ed" },
  Dockerfile: { iconPath: mdiDocker, label: "dockerfile", color: "#2496ed" },

  md: { iconPath: mdiFileDocumentOutline, label: "markdown", color: "#083fa1" },
  mdx: { iconPath: mdiFileDocumentOutline, label: "mdx", color: "#083fa1" },
  markdown: {
    iconPath: mdiFileDocumentOutline,
    label: "markdown",
    color: "#083fa1",
  },
  rst: {
    iconPath: mdiFileDocumentOutline,
    label: "restructuredtext",
    color: "#083fa1",
  },
  tex: { iconPath: mdiFileDocumentOutline, label: "latex", color: "#0f766e" },

  xls: { iconPath: mdiFileExcel, label: "excel", color: "#217346" },
  xlsx: { iconPath: mdiFileExcel, label: "excel", color: "#217346" },

  odt: {
    iconPath: mdiFileDocumentOutline,
    label: "opendocument text",
    color: "#0a7c3a",
  },
  ods: {
    iconPath: mdiFileExcel,
    label: "opendocument spreadsheet",
    color: "#0a7c3a",
  },
  pdf: { iconPath: mdiFilePdfBox, label: "pdf", color: "#f40f02" },
  doc: { iconPath: mdiMicrosoftWord, label: "doc", color: "#2b579a" },
  docx: { iconPath: mdiMicrosoftWord, label: "docx", color: "#2b579a" },
  odp: {
    iconPath: mdiFilePowerpoint,
    label: "opendocument presentation",
    color: "#0a7c3a",
  },
  odg: {
    iconPath: mdiFileDocumentOutline,
    label: "opendocument graphic",
    color: "#0a7c3a",
  },
  ppt: { iconPath: mdiFilePowerpoint, label: "powerpoint", color: "#d24726" },
  pptx: { iconPath: mdiFilePowerpoint, label: "powerpoint", color: "#d24726" },

  run: { iconPath: mdiBash, label: "linux installer", color: "#4fa816" },
  deb: { iconPath: mdiPackage, label: "debian package", color: "#a80030" },

  /** Executables / installers / packages */
  exe: {
    iconPath: mdiMicrosoftWindows,
    label: "windows executable",
    color: "#0078d4",
  },
  msi: {
    iconPath: mdiPackageVariantClosed,
    label: "windows installer",
    color: "#0078d4",
  },
  msix: {
    iconPath: mdiPackageVariantClosed,
    label: "windows package",
    color: "#0078d4",
  },
  msixbundle: {
    iconPath: mdiPackageVariantClosed,
    label: "windows package bundle",
    color: "#0078d4",
  },
  appx: {
    iconPath: mdiPackageVariantClosed,
    label: "windows app package",
    color: "#0078d4",
  },
  appxbundle: {
    iconPath: mdiPackageVariantClosed,
    label: "windows app bundle",
    color: "#0078d4",
  },

  dll: {
    iconPath: mdiApplicationCog,
    label: "dynamic library",
    color: "#64748b",
  },
  sys: {
    iconPath: mdiApplicationCog,
    label: "system binary",
    color: "#64748b",
  },
  drv: { iconPath: mdiApplicationCog, label: "driver", color: "#64748b" },
  com: {
    iconPath: mdiApplicationCog,
    label: "command executable",
    color: "#64748b",
  },
  scr: {
    iconPath: mdiApplicationCog,
    label: "screensaver executable",
    color: "#64748b",
  },

  bat: { iconPath: mdiScript, label: "batch script", color: "#4fa816" },
  cmd: { iconPath: mdiScript, label: "command script", color: "#4fa816" },
  ps1: { iconPath: mdiScript, label: "powershell script", color: "#2b579a" },
  psm1: { iconPath: mdiScript, label: "powershell module", color: "#2b579a" },
  psd1: { iconPath: mdiScript, label: "powershell data", color: "#2b579a" },

  appimage: {
    iconPath: mdiPackageVariantClosed,
    label: "appimage package",
    color: "#4fa816",
  },
  rpm: {
    iconPath: mdiPackageVariantClosed,
    label: "rpm package",
    color: "#1f6feb",
  },
  apk: {
    iconPath: mdiPackageVariantClosed,
    label: "apk package",
    color: "#3ddc84",
  },
  pkg: {
    iconPath: mdiPackageVariantClosed,
    label: "package installer",
    color: "#8b5cf6",
  },
  snap: {
    iconPath: mdiPackageVariantClosed,
    label: "snap package",
    color: "#e95420",
  },
  flatpak: {
    iconPath: mdiPackageVariantClosed,
    label: "flatpak package",
    color: "#0f75ff",
  },
  flatpakref: {
    iconPath: mdiPackageVariantClosed,
    label: "flatpak reference",
    color: "#0f75ff",
  },

  jar: {
    iconPath: mdiPackageVariantClosed,
    label: "java archive",
    color: "#f89820",
  },
  war: {
    iconPath: mdiPackageVariantClosed,
    label: "web archive",
    color: "#f89820",
  },
  ear: {
    iconPath: mdiPackageVariantClosed,
    label: "enterprise archive",
    color: "#f89820",
  },

  /** Disk images / virtual disks */
  ...fromEntries(
    [
      "iso",
      "img",
      "dmg",
      "bin",
      "cue",
      "nrg",
      "mdf",
      "vhd",
      "vhdx",
      "vmdk",
      "qcow2",
    ].map((ext) => [
      ext,
      {
        iconPath: mdiDisc,
        label: ext + " disk image",
        color: "#64748b",
      },
    ]),
  ),

  /** Images */
  ...fromEntries(
    ["bmp", "gif", "jpeg", "jpg", "png", "tiff"].map((ext) => [
      ext,
      { iconPath: mdiImage, label: ext, color: "#af4c99" },
    ]),
  ),
  svg: { iconPath: mdiSvg, label: "svg", color: "#af4c99" },

  /** Audio */
  ...fromEntries(
    ["mp3", "wav", "ogg", "flac", "aac", "m4a"].map((ext) => [
      ext,
      {
        iconPath: mdiFileMusic,
        label: ext + " audio",
        color: "#af4c99",
      },
    ]),
  ),

  /** Video */
  ...fromEntries(
    ["mp4", "mkv", "webm", "avi", "mov", "flv"].map((ext) => [
      ext,
      {
        iconPath: mdiVideo,
        label: ext + " video/audio",
        color: "#af4c99",
      },
    ]),
  ),

  /** Data / database */
  ...fromEntries(
    [
      "db",
      "sqlite",
      "sqlite3",
      "db3",
      "duckdb",
      "parquet",
      "feather",
      "arrow",
      "avro",
      "orc",
    ].map((ext) => [
      ext,
      {
        iconPath: mdiDatabase,
        label: ext + " data",
        color: "#336791",
      },
    ]),
  ),

  /** Audio */
  ...fromEntries(
    ["mp3", "wav", "ogg", "flac", "aac", "m4a"].map((ext) => [
      ext,
      {
        iconPath: mdiFileMusic,
        label: ext + " audio",
        color: "#af4c99",
      },
    ]),
  ),

  /** Compressed / archives */
  ...fromEntries(
    [
      "zip",
      "gz",
      "tgz",
      "bz2",
      "xz",
      "rar",
      "7z",
      "tar",
      "zst",
      "lz4",
      "cab",
    ].map((ext) => [
      ext,
      {
        iconPath: mdiArchive,
        label: ext + " archive",
        color: "#0bb338",
      },
    ]),
  ),

  /** LLM / ML artifacts */
  ...fromEntries(
    [
      "gguf",
      "safetensors",
      "onnx",
      "pt",
      "pth",
      "ckpt",
      "pb",
      "tflite",
      "npz",
      "npy",
      "h5",
    ].map((ext) => [
      ext,
      {
        iconPath: mdiBrain,
        label: ext + " model",
        color: "#8b5cf6",
      },
    ]),
  ),
  ipynb: { iconPath: mdiBrain, label: "notebook", color: "#f37626" },
  jsonl: { iconPath: mdiCodeJson, label: "jsonl", color: "#c69b19" },
  ndjson: { iconPath: mdiCodeJson, label: "ndjson", color: "#c69b19" },
  prompt: {
    iconPath: mdiFileDocumentOutline,
    label: "prompt",
    color: "#7c3aed",
  },
  prompts: {
    iconPath: mdiFileDocumentOutline,
    label: "prompts",
    color: "#7c3aed",
  },

  /** More source / project files commonly seen by developers */
  java: { iconPath: mdiPackageVariantClosed, label: "java", color: "#f89820" },
  class: {
    iconPath: mdiPackageVariantClosed,
    label: "java class",
    color: "#f89820",
  },
  kt: { iconPath: mdiFileDocumentOutline, label: "kotlin", color: "#7f52ff" },
  kts: {
    iconPath: mdiFileDocumentOutline,
    label: "kotlin script",
    color: "#7f52ff",
  },

  c: { iconPath: mdiLanguageC, label: "c", color: "#5c6bc0" },
  h: { iconPath: mdiLanguageFortran, label: "c header", color: "#5c6bc0" },
  cpp: { iconPath: mdiLanguageCpp, label: "c++", color: "#00599c" },
  cc: { iconPath: mdiFileDocumentOutline, label: "c++", color: "#00599c" },
  cxx: { iconPath: mdiFileDocumentOutline, label: "c++", color: "#00599c" },
  hpp: {
    iconPath: mdiFileDocumentOutline,
    label: "c++ header",
    color: "#00599c",
  },
  hh: {
    iconPath: mdiFileDocumentOutline,
    label: "c++ header",
    color: "#00599c",
  },

  cs: {
    iconPath: mdiLanguageCsharp,
    label: "csharp",
    color: "#68217a",
  },
  fs: { iconPath: mdiFileDocumentOutline, label: "fsharp", color: "#378bba" },
  fsx: {
    iconPath: mdiFileDocumentOutline,
    label: "fsharp script",
    color: "#378bba",
  },

  rs: { iconPath: mdiLanguageRust, label: "rust", color: "#ce422b" },
  php: { iconPath: mdiLanguagePhp, label: "php", color: "#777bb4" },
  swift: { iconPath: mdiLanguageSwift, label: "swift", color: "#f05138" },
  dart: { iconPath: mdiFileDocumentOutline, label: "dart", color: "#0175c2" },
  lua: { iconPath: mdiFileDocumentOutline, label: "lua", color: "#2c2d72" },
  r: { iconPath: mdiLanguageR, label: "r", color: "#276dc3" },
  scala: { iconPath: mdiFileDocumentOutline, label: "scala", color: "#dc322f" },

  /** Infra / config / build */
  tf: {
    iconPath: mdiFileDocumentOutline,
    label: "terraform",
    color: "#7b42bc",
  },
  tfvars: {
    iconPath: mdiFileDocumentOutline,
    label: "terraform variables",
    color: "#7b42bc",
  },
  hcl: {
    iconPath: mdiFileDocumentOutline,
    label: "hcl config",
    color: "#7b42bc",
  },
  nix: { iconPath: mdiFileDocumentOutline, label: "nix", color: "#5277c3" },
  cue: { iconPath: mdiFileDocumentOutline, label: "cue", color: "#ef6c00" },
  plist: {
    iconPath: mdiFileDocumentOutline,
    label: "property list",
    color: "#64748b",
  },
  properties: {
    iconPath: mdiFileDocumentOutline,
    label: "properties",
    color: "#6b7280",
  },

  /** Certificates / keys / signing artifacts */
  pem: {
    iconPath: mdiCertificate,
    label: "certificate or key",
    color: "#64748b",
  },
  key: { iconPath: mdiApplicationCog, label: "private key", color: "#64748b" },
  pub: { iconPath: mdiCertificate, label: "public key", color: "#64748b" },
  crt: { iconPath: mdiCertificate, label: "certificate", color: "#64748b" },
  cer: { iconPath: mdiCertificate, label: "certificate", color: "#64748b" },
  csr: {
    iconPath: mdiApplicationCog,
    label: "certificate request",
    color: "#64748b",
  },
  p12: {
    iconPath: mdiPackageVariantClosed,
    label: "certificate bundle",
    color: "#64748b",
  },
  pfx: {
    iconPath: mdiPackageVariantClosed,
    label: "certificate bundle",
    color: "#64748b",
  },
  asc: {
    iconPath: mdiFileDocumentOutline,
    label: "signature or armored key",
    color: "#64748b",
  },
  sig: {
    iconPath: mdiSignature,
    label: "signature",
    color: "#64748b",
  },

  /** Platform-specific dev files */
  sln: {
    iconPath: mdiMicrosoftWindows,
    label: "visual studio solution",
    color: "#68217a",
  },
  csproj: {
    iconPath: mdiMicrosoftVisualStudio,
    label: "csharp project",
    color: "#68217a",
  },
  vcxproj: {
    iconPath: mdiMicrosoftVisualStudio,
    label: "visual c++ project",
    color: "#5c2d91",
  },
  vcproj: {
    iconPath: mdiMicrosoftVisualStudio,
    label: "visual c++ project",
    color: "#5c2d91",
  },
  props: {
    iconPath: mdiMicrosoftWindows,
    label: "msbuild props",
    color: "#5c2d91",
  },
  targets: {
    iconPath: mdiMicrosoftWindows,
    label: "msbuild targets",
    color: "#5c2d91",
  },
  nuspec: {
    iconPath: mdiPackageVariantClosed,
    label: "nuget spec",
    color: "#004880",
  },
  nupkg: {
    iconPath: mdiPackageVariantClosed,
    label: "nuget package",
    color: "#004880",
  },
  reg: {
    iconPath: mdiMicrosoftWindows,
    label: "windows registry",
    color: "#0078d4",
  },

  ipa: {
    iconPath: mdiPackageVariantClosed,
    label: "ios app package",
    color: "#64748b",
  },
  mobileprovision: {
    iconPath: mdiPackageVariantClosed,
    label: "apple provisioning profile",
    color: "#64748b",
  },
  entitlements: {
    iconPath: mdiFileDocumentOutline,
    label: "apple entitlements",
    color: "#64748b",
  },
  xcconfig: {
    iconPath: mdiFileDocumentOutline,
    label: "xcode config",
    color: "#147efb",
  },
  pbxproj: {
    iconPath: mdiFileDocumentOutline,
    label: "xcode project",
    color: "#147efb",
  },
  xib: {
    iconPath: mdiFileDocumentOutline,
    label: "interface builder",
    color: "#147efb",
  },
  storyboard: {
    iconPath: mdiFileDocumentOutline,
    label: "storyboard",
    color: "#147efb",
  },

  desktop: {
    iconPath: mdiFileDocumentOutline,
    label: "desktop entry",
    color: "#4fa816",
  },
  service: {
    iconPath: mdiApplicationCog,
    label: "systemd service",
    color: "#4fa816",
  },
  socket: {
    iconPath: mdiApplicationCog,
    label: "systemd socket",
    color: "#4fa816",
  },
  timer: {
    iconPath: mdiApplicationCog,
    label: "systemd timer",
    color: "#4fa816",
  },
  mount: {
    iconPath: mdiApplicationCog,
    label: "systemd mount",
    color: "#4fa816",
  },
  automount: {
    iconPath: mdiApplicationCog,
    label: "systemd automount",
    color: "#4fa816",
  },
  target: {
    iconPath: mdiApplicationCog,
    label: "systemd target",
    color: "#4fa816",
  },
  spec: { iconPath: mdiPackage, label: "package spec", color: "#1f6feb" },

  /** Native libs / objects often seen in dev workflows */
  so: {
    iconPath: mdiApplicationCog,
    label: "shared library",
    color: "#64748b",
  },
  dylib: {
    iconPath: mdiApplicationCog,
    label: "dynamic library",
    color: "#64748b",
  },
  a: { iconPath: mdiApplicationCog, label: "static library", color: "#64748b" },
  lib: { iconPath: mdiApplicationCog, label: "library", color: "#64748b" },
  o: { iconPath: mdiApplicationCog, label: "object file", color: "#64748b" },
  obj: { iconPath: mdiApplicationCog, label: "object file", color: "#64748b" },
  ko: { iconPath: mdiApplicationCog, label: "kernel module", color: "#64748b" },
};
