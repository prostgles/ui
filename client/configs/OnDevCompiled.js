const fs = require("fs")
const path = require("path")

let inDebounce;

class OnDevCompiled {
  apply(compiler) {
    compiler.hooks.afterEmit.tap(
      'Hello World Plugin',
      _stats => {
        clearTimeout(inDebounce);
        inDebounce = setTimeout(() => {
          fs.writeFileSync(path.join(__dirname, "./last_compiled.txt"), Date.now().toString(), { encoding: "utf-8" });
        }, 50);
      }
    );
  }
}

module.exports = OnDevCompiled;