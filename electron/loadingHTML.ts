import * as fs from "fs";
import * as path from "path";

const svgLogo = fs.readFileSync(
  path.join(__dirname, "/../images/prostgles-logo-rounded.svg"),
  { encoding: "utf-8" },
);
const logoWithoutFirstLine = svgLogo
  .split("\n")
  .slice(1)
  .join("\n")
  .replace(`height="512"`, "")
  .replace(`width="512"`, "");

const cssAnimation = fs.readFileSync(
  path.join(__dirname, "/../images/loading-effect.css"),
  { encoding: "utf-8" },
);

const htmlToDataUrl = (html: string) =>
  "data:text/html;charset=UTF-8," + encodeURIComponent(html);

export const loadingHTML = htmlToDataUrl(`
<!DOCTYPE html>
<html lang="en" class="o-hidden">
  <head>

    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <meta
      name="description"
      content=" "
    />
    
    <title>Prostgles Desktop</title>
    <style>
      html, body {
        width: 100%;
        height: 100%;
        text-align: center;
        display: flex;
        flex: 1;
        display: flex;
        flex: 1;
        height: 100%;
        overflow: hidden;
        align-items: center;
        justify-content: center;
      }

      ${cssAnimation}
    </style>
  </head>
  <body>
    <main id="root" style="width: 100px; height: 100px;">
      ${logoWithoutFirstLine}
    </main>
    
  </body>
</html>

`);
