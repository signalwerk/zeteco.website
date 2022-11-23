import { load, write } from "./util/file.js";
import {
  removeCommentByText,
  removeTools,
  replaceLinkUrl,
  fixLinkToFS,
} from "./util/dom.js";
import { getAll } from "./util/getter.js";
import url from "url";

const {
  removeBySelector,
  reportRemoved,
  writeRemoved,
  setCheerio,
  registerUsedLinks,
  removeLinkByUrlMatch,
} = removeTools();

const filename = process.argv[2];
const mode = process.argv[3];

console.log(`${filename} processing (${mode})`);

switch (mode) {
  case "standardize": {
    const $ = load(filename);

    removeCommentByText($, $("body")[0], "Transclusion expansion time report");
    removeCommentByText($, $("body")[0], "NewPP limit report");

    write($, filename);
    break;
  }
  case "clean-up": {
    const $ = load(filename);
    setCheerio($);

    // remove head of page
    removeBySelector("#mw-head");

    // remove all links to edit pages
    $(".mw-editsection").remove();

    // no forms
    $("form").remove();

    // remove links in left navigation
    $("#p-Wiki").remove();
    removeBySelector("#t-whatlinkshere");
    removeBySelector("#t-recentchangeslinked");
    removeBySelector("#t-upload");
    removeBySelector("#t-print");
    removeBySelector("#t-permalink");
    removeBySelector("#t-info");
    removeBySelector("#t-cargopagevalueslink");
    removeBySelector("#n-Travel");
    removeBySelector("#p-Wiki_Development");

    // remove links in left navigation on user pages
    removeBySelector("#t-contributions");
    removeBySelector("#t-log");

    // remove all additional-links to a users
    $(".mw-usertoollinks").remove();

    // remove all links with no existing href
    $("a.new").each(function () {
      $(this).replaceWith($(this).text());
    });

    // remove some feed links
    $('link[type="application/x-wiki"]').remove();
    $('link[type="application/rsd+xml"]').remove();
    $('link[type="application/atom+xml"]').remove();
    $('link[rel="edit"]').remove();
    $('link[rel="alternate"]').remove();
    $('link[rel="EditURI"]').remove();
    $('link[rel="search"]').remove();

    // remove some css I don't know where they come from…
    // $('link[href*="load.php"]').remove();

    // removed some special pages that were not fetched
    removeLinkByUrlMatch("Form:OrgaProject");
    removeLinkByUrlMatch("Form:EventVillage", { keepText: true });
    removeLinkByUrlMatch("Special:ListUsers&offset=", { keepText: true });
    removeLinkByUrlMatch("Special:ListUsers&dir=", { keepText: true });
    removeLinkByUrlMatch("Special:RecentChanges", { keepText: true });
    removeLinkByUrlMatch("wiki/Template:", { keepText: true });
    removeLinkByUrlMatch("wiki/Form:OrgaTeam");

    // fix some user links
    // replaceLinkUrl($, /http:\/\/localhost\/wiki\/User:(.*)/g, "./User:$1.html");

    // no favicon
    $('link[rel="shortcut icon"]').remove();

    // links in footer with 404
    removeBySelector("#footer-places");

    // remove redirect information
    removeBySelector(".mw-redirectedfrom");

    // sometimes there is a print footer
    removeBySelector(".printfooter");

    // remove creation of the pages
    removeBySelector("#n-Create-Orga-Project");

    // remove link to contributions
    removeBySelector("#pt-anoncontribs");

    // remove form for user-list (http://localhost/wiki/Special:ListUsers)
    removeBySelector("#mw-listusers-form");
    // remove pagination lists
    removeBySelector("p:has(a.mw-numlink)");

    // fix Vereinsstatuten link
    $("a").each((i, el) => {
      const href = $(el).attr("href");
      if (href && href.includes("index.php")) {
        var query = url.parse(href, true).query;

        if (query.title && query.title === "Vereinsstatuten") {
          $(el).remove();
        }
      }
    });

    // fix links if local file exists
    fixLinkToFS($, "a", (el, getPath) => {
      const href = $(el).attr("href");

      if (href && href.startsWith("http://localhost/")) {
        const destination = href.replace(
          /http:\/\/localhost\/([^"']+)/,
          "./localhost/$1.html"
        );

        const newPath = getPath(filename, destination);
        if (newPath) {
          $(el).attr("href", newPath.replaceAll(":", "%3A"));
        }
      } else {
        return false;
      }
    });

    // fix images if local file exists
    fixLinkToFS($, "img", (el, getPath) => {
      const src = $(el).attr("src").trim();

      if (src && src.startsWith("http://localhost/")) {
        const destination = src.replace(
          /http:\/\/localhost\/([^"']+)/,
          "./localhost/$1.html"
        );

        const newPath = getPath(filename, destination);
        if (newPath) {
          $(el).attr("src", newPath.replaceAll(":", "%3A"));
        }
      } else {
        return false;
      }
    });

    registerUsedLinks();

    write($, filename);
    break;
  }

  case "test": {
    const $ = load(filename);
    setCheerio($);

    removeBySelector(".link");
    removeBySelector(".test");

    removeLinkByUrlMatch("Special:Contributions");
    removeLinkByUrlMatch("Form:EventVillage", { keepText: true });

    fixLinkToFS($, "a", (el, getPath) => {
      const href = $(el).attr("href");

      if (href.startsWith("http://localhost/")) {
        const destination = href.replace(
          /http:\/\/localhost\/([^"']+)/,
          "./localhost/$1.html"
        );

        const newPath = getPath("./localhost/wiki/test.html", destination);
        // const newPath = getPath(filename, destination);
        if (newPath) {
          $(el).attr("href", newPath);
        }
      } else {
        return false;
      }
    });

    // no favicon
    $('link[rel="shortcut icon"]').remove();

    registerUsedLinks();
    // reportRemoved();

    write($, `${filename}.cleaned-up.html`);
    break;
  }
  case "dl": {
    getAll(filename);
    break;
  }
  default: {
    console.error(`Unknown mode: ${mode}`);
  }
}

writeRemoved();
