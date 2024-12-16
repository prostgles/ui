/** Save all mdi icons as xml */
const fs = require("fs");
const path = require("path");
const icons = require("@mdi/js");

const saveMdiIcons = () => {
  const iconEntries = Object.entries(icons);
  const iconsDestinationFolder = path.join(__dirname, "/static/icons");
  if (fs.existsSync(iconsDestinationFolder)) {
    const contents = fs.readdirSync(iconsDestinationFolder);
    if (contents.length >= iconEntries.length) {
      console.log(`Already saved ${contents.length} icons`);
      return;
    }
    fs.rm(iconsDestinationFolder, { recursive: true }, console.log);
  }
  fs.mkdirSync(iconsDestinationFolder, { recursive: true });
  if (!iconEntries.length) {
    console.error("No icons found. Did you run npm i ?!");
    process.exit(1);
  }

  const iconNames = [];
  iconEntries.forEach(([name, iconPathD]) => {
    const nameWithoutMdi = name.slice(3);
    iconNames.push(nameWithoutMdi);
    const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="presentation">
      <path d="${iconPathD}" style="fill: currentcolor;"></path>
    </svg>`;
    fs.writeFileSync(
      path.join(iconsDestinationFolder, `${name.slice(3)}.svg`),
      iconSvg,
      { encoding: "utf8" },
    );
  });
  console.log(` Saved ${iconEntries.length} icons`);
  fs.writeFileSync(
    path.join(iconsDestinationFolder, "_meta.json"),
    JSON.stringify(iconNames, null, 2),
    { encoding: "utf8" },
  );
};

setTimeout(saveMdiIcons, 1000);

class SaveMdiIcons {
  apply(compiler) {
    compiler.hooks.afterEmit.tap(
      "Save Mdi icons plugin afterEmit",
      (_stats) => {
        setTimeout(saveMdiIcons, 1000);
      },
    );
    compiler.hooks.done.tap("Save Mdi icons plugin done", (_stats) => {
      setTimeout(saveMdiIcons, 1000);
    });
  }
}

module.exports = { SaveMdiIcons };
