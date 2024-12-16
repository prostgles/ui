module.exports = {
  packagerConfig: {
    icon: "icon512.png",
  },
  electronPackagerConfig: {
    icon: "icon512.png",
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-dmg",
      config: {
        icon: "image.ico",
      },
    },
    {
      name: "@electron-forge/maker-deb",
      config: {
        options: {
          icon: "icon512.png",
          homepage: "https://prostgles.com/desktop",
        },
      },
    },
  ],
};
