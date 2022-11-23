import axios from "axios";
import fs from "fs";
import path from "path";
import "./getRelativeURL.js";
import { load, write } from "./file.js";

const STATUS = {
  DOWNLOADING: "DOWNLOADING",
  DOWNLOADED: "DOWNLOADED",
  ERROR: "ERROR",
  REDIRECT: "REDIRECT",
};

const urlObj = {
  status: STATUS.DOWNLOADING,
  mime: null, // the mime of the response
  responseUrl: null, // the url after redirect
  fsPath: "",
};

const mime2ext = {
  "text/html": "html",
  "text/css": "css",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "application/javascript": "js",
  "application/pdf": "pdf",
  "application/opensearchdescription+xml": "xml",
  "application/rsd+xml": "xml",
  "application/xml": "xml",
};

function relativeLink(from, to, destinationUrl) {
  const hash = destinationUrl.hash;
  return `${path.relative(path.dirname(from), to)}${hash ? `#${hash}` : ""}`;
}

function ensureDirectoryExistence(filePath) {
  var dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
  return true;
}

function getExtension(filename) {
  var ext = path.extname(filename || "").split(".");
  return ext[ext.length - 1];
}

function fixFilename(name) {
  const filename = name; //.replace(/%7C/g, "|");
  const ext = path.extname(filename);
  const basename = path.basename(filename, ext);

  const result = `${basename.slice(0, 240 - ext.length)}${ext}`;

  return result;
}

// https://stackoverflow.com/questions/70643383/which-mime-types-contain-charset-utf-8-directive
function getFsPath(fsPath, mime) {
  const mimeExt = mime2ext[mime];
  if (!mimeExt) {
    console.error("no ext for mime", mime);
    throw new Error(`No extension for mime type ${mime}`);
  }

  const url = new URL(fsPath);
  const pathname = url.pathname;
  url.searchParams.sort();
  const params = new URLSearchParams(url.search).toString(); // ?.sort()?.toString() || "";

  const dirname = path.dirname(pathname);
  const basename = path.basename(pathname);
  // const basename = path.basename(pathname, path.extname(pathname));

  const fsExt = getExtension(pathname);
  const ext = mimeExt || fsExt;

  let result = `${url.hostname}`;

  if (pathname.endsWith("/") && mimeExt === "html") {
    return `${result}${pathname}index.html`;
  }

  const filename = `${basename}${
    params ? `?${decodeURIComponent(params)}.${ext}` : ""
  }${!params && mimeExt !== fsExt ? `.${ext}` : ""}`;

  result = `${result}${dirname ? `${dirname}/` : ""}${fixFilename(filename)}`;

  return result;
}

function standardizeURL(url) {
  const urlObj = new URL(url);
  urlObj.searchParams.sort();
  urlObj.hash = "";
  return urlObj.toString();
}

export function getAll(url) {
  console.log(`getAll(${url})`);

  const conf = {
    domains: ["localhost"],
    reject:
      /.*(opensearch_desc|Special:MyTalk|Special:UploadWizard|Special:RecentChanges|Special:CargoTables|Form:EventVillage|Form:OrgaProject|Form:OrgaTeam|Special:Templates|Template:|Special:MyContributions|Special:FormEdit|Special:CreateAccount|Special:Random|Special:Log|Special:Contributions|Special:WhatLinksHere|Special:UserLogin|action=|title=.*oldid|printable=yes).*/,
    toLoad: new Map(),
    toProcess: new Map(),
    loaded: {
      // "http://localhost/example": {
      //   ...urlObj,
      // },
    },
  };

  conf.toLoad.set(standardizeURL(url), url);

  return processor(conf).then(() => {
    fs.writeFileSync("conf.json", JSON.stringify(conf, false, 2));
  });
}

export function process(conf) {
  const [fsPath] = conf.toProcess.keys(); // first file to process
  const sourceUrl = conf.toProcess.get(fsPath);

  console.log(`process ${sourceUrl}`);

  const $ = load(fsPath);

  const newDL = [];

  $("a,link").each((i, el) => {
    const href = $(el).attr("href");
    if (href) {
      const destinationUrl = new URL(href, sourceUrl);

      if (conf.domains.includes(destinationUrl.hostname)) {
        if (!destinationUrl.href.match(conf.reject)) {
          const dlUrl = standardizeURL(destinationUrl.href);
          if (!conf.loaded[dlUrl]) {
            newDL.push(destinationUrl.href);
          } else {
            const newPath = relativeLink(
              fsPath,
              conf.loaded[dlUrl].fsPath,
              destinationUrl
            );

            if (href !== newPath) {
              $(el).attr("href", newPath.replace(/\?/g, "%3F"));
            }
          }
        }
      }
    }
  });

  if (newDL.length === 0) {
    conf.toProcess.delete(fsPath);
    write($, fsPath);
  } else {
    newDL.forEach((url) => {
      conf.toLoad.set(standardizeURL(url), url);
    });
  }
}

export async function processor(conf) {
  let stopped = false;

  while (!stopped) {
    if (conf.toLoad.size > 0) {
      // await loadUrl(conf);
      const loadings = [];
      while (conf.toLoad.size) {
        loadings.push(loadUrl(conf));
      }
      await Promise.all(loadings);
      fs.writeFileSync("conf.json", JSON.stringify(conf, false, 2));
    }
    if (conf.toProcess.size > 0) {
      process(conf);
    }
    if (conf.toLoad.size === 0 && conf.toProcess.size === 0) {
      stopped = true;
    }
  }
}

export async function loadUrl(conf) {
  const [stdUrl] = conf.toLoad.keys(); // first file to process
  const url = conf.toLoad.get(stdUrl);

  conf.toLoad.delete(stdUrl);
  console.log(`Load ${url}`);

  return axios({
    method: "get",
    url,
    responseType: "stream",
    headers: { "Accept-Encoding": "br" }, // (gzip, deflate, br) for some weird reason zip encoding is not always removed from result
    // encoding: null,
    // responseType: "arraybuffer",
  })
    .then((response) => {
      const mime = response.headers["content-type"]
        .toLocaleLowerCase()
        .split(";")[0];

      const responseUrl = response.request.res.responseUrl;
      const stdResponseUrl = standardizeURL(responseUrl);

      const fsPath = getFsPath(responseUrl, mime);

      // if it's html we need to process it later
      if (mime === "text/html") {
        conf.toProcess.set(fsPath, responseUrl);
      }

      conf.loaded[stdUrl] = {
        ...urlObj,
        status: STATUS.REDIRECT,
        fsPath,
        mime: mime,
        responseUrl,
      };

      if (stdUrl !== stdResponseUrl) {
        conf.loaded[stdResponseUrl] = {
          ...urlObj,
          status: STATUS.DOWNLOADED,
          fsPath,
          mime: mime,
          responseUrl,
        };
      }

      ensureDirectoryExistence(fsPath);

      const writer = fs.createWriteStream(fsPath, "binary");
      return new Promise((resolve, reject) => {
        response.data.pipe(writer);
        let error = null;
        writer.on("error", (err) => {
          console.error("--- error a", err.message);
          error = err;
          writer.close();
          // reject(err);
          resolve(true);
        });
        writer.on("close", () => {
          if (!error) {
            resolve(true);
          } else {
            throw new Error(error);
            resolve(true);
          }
        });
      });
    })
    .catch((err) => {
      console.error("dl-error", url);
      console.error("dl-error", err.message);
      conf.loaded[url] = {
        ...urlObj,
        status: STATUS.ERROR,
        fsPath: url,
      };
    });
}
