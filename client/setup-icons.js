/** Save all mdi icons as xml */
const fs = require('fs');
const path = require('path');
const icons = require('@mdi/js');
const iconsDestinationFolder = path.join(__dirname, '/static/icons');
if(fs.existsSync(iconsDestinationFolder)) {
  fs.rmdir(iconsDestinationFolder, { recursive: true }, console.log);
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
fs.writeFileSync(path.join(iconsDestinationFolder, "_meta.json"), JSON.stringify(iconNames, null, 2), { encoding: 'utf8' });