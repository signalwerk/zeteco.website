import prettier from "prettier";
import fs from "fs";
import cheerio from "cheerio";

export function load(filename) {
  const htmlString = fs.readFileSync(filename, "utf8");
  const $ = cheerio.load(htmlString);
  return $;
}

export function write($, filename) {
  const htmlRaw = $.html();
  const html = prettier.format(`${htmlRaw}`, { parser: "html" });
  fs.writeFileSync(filename, html);
}
