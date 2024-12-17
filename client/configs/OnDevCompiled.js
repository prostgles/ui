const fs = require("fs");
const path = require("path");

let inDebounce;
let fileWasSaved = false;
const saveFile = () => {
  clearTimeout(inDebounce);
  inDebounce = setTimeout(() => {
    const filePath = path.join(__dirname, "./last_compiled.txt");
    fs.writeFileSync(filePath, Date.now().toString(), { encoding: "utf-8" });
    if (!fileWasSaved) {
      console.log("Prostgles UI accessible at");
    }
    fileWasSaved = true;
  }, 1000);
};

class OnDevCompiled {
  apply(compiler) {
    compiler.hooks.afterEmit.tap("Hot reload plugin", (_stats) => {
      console.log("\nOnDevCompiled: afterEmit");
      saveFile();
    });
    compiler.hooks.done.tap("Hot reload plugin on done", (_stats) => {
      console.log("\nOnDevCompiled: done");
      saveFile();
    });
  }
}

module.exports = OnDevCompiled;
