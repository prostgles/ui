/** Save all mdi icons as xml */
const fs = require('fs');
const path = require('path');
const icons = require('@mdi/js');

let saved = false;
const saveMdiIcons = () => {
  if(saved) return;
  saved = true;
  const iconsDestinationFolder = path.join(__dirname, '/static/icons');
  if(fs.existsSync(iconsDestinationFolder)) {
    fs.rm(iconsDestinationFolder, { recursive: true }, console.log);
  }
  fs.mkdirSync(iconsDestinationFolder, { recursive: true });
  const iconEntries = Object.entries(icons);
  if(!iconEntries.length) {
    console.error('No icons found. Did you run npm i ?!');
    process.exit(1);
  }
  
  const iconNames = [];
  iconEntries.forEach(([name, iconPathD]) => {
    const nameWithoutMdi = name.slice(3);
    iconNames.push(nameWithoutMdi);
    const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="presentation">
      <path d="${iconPathD}" style="fill: currentcolor;"></path>
    </svg>`;
    fs.writeFileSync(path.join(iconsDestinationFolder, `${name.slice(3)}.svg`), iconSvg, { encoding: 'utf8' });
  });
  console.log(` Saved ${iconEntries.length} icons`);
  fs.writeFileSync(path.join(iconsDestinationFolder, "_meta.json"), JSON.stringify(iconNames, null, 2), { encoding: 'utf8' });
}

class SaveMdiIcons {
  apply(compiler) {
    compiler.hooks.afterEmit.tap(
      'Save Mdi icons plugin afterEmit',
      _stats => {
        saveMdiIcons();
      }
    );
    compiler.hooks.done.tap(
      'Save Mdi icons plugin done',
      _stats => {
        saveMdiIcons();
      }
    );
  }
}

module.exports = { SaveMdiIcons };