import fs from "fs";
import "./getRelativeURL.js";

export function removeTools(cheerio) {
  let $ = cheerio;
  const removedLinks = new Set();
  const usedLinks = new Set();

  function getUnusedLinks() {
    return [...removedLinks].filter((i) => !usedLinks.has(i));
  }

  function reportRemoved() {
    const notUsedLinks = getUnusedLinks();

    console.log({ removedLinks, usedLinks, notUsedLinks });
  }
  function writeRemoved() {
    const notUsedLinks = getUnusedLinks();

    fs.writeFileSync("removed-links.txt", notUsedLinks.join("\r"));
  }
  function remove(el, deep = true) {
    el.each((i, el) => {
      const href = $(el).attr("href");

      if (deep) {
        remove($(el).find("a"), false);
      }

      if (href) {
        removedLinks.add(href);
      }
    });

    el.remove();
  }
  function removeByUrl($, url) {
    $("a").each((i, el) => {
      const href = $(el).attr("href");

      const found = node.data.match(url);
      if (found?.length > 0) {
        //   node.data = "";
        remove($(el));
      }
    });
  }

  function setCheerio(cheerio) {
    $ = cheerio;
  }
  function registerUsedLinks() {
    $("a").each((i, el) => {
      const href = $(el).attr("href");

      if (href) {
        usedLinks.add(href);
      }
    });
  }
  function removeBySelector(selector) {
    remove($(selector));
  }

  function removeLinkByUrlMatch(text, options = {}) {
    const { keepText } = options;
    const links = $("a");
    links.each((i, el) => {
      const href = $(el).attr("href");
      if (href && href.match(text)) {
        if (keepText) {
          const text = $(el).text();
          $(el).replaceWith(text);

          if (href) {
            removedLinks.add(href);
          }
        } else {
          remove($(el));
        }
      }
    });
  }

  return {
    reportRemoved,
    removeBySelector,
    setCheerio,
    registerUsedLinks,
    writeRemoved,
    removeLinkByUrlMatch,
  };
}

export function fixLinkToFS($, selector, cb) {
  const links = $(selector);
  links.each((i, el) => {
    cb(el, (current, destination) => {
      if (fs.existsSync(destination)) {
        const path = new URL(`http://localhost/${destination}`);
        const newPath = path.getRelativeURL(`http://localhost/${current}`);
        return newPath;
      } else {
        return false;
      }
    });
  });
}

export function replaceLinkUrl($, search, replace) {
  const links = $("a");
  links.each((i, el) => {
    const href = $(el).attr("href");
    if (href && href.match(search)) {
      $(el).attr("href", href.replace(search, replace));
    }
  });
}

export function removeCommentByText($, root, text) {
  traverseTree(root, (node) => {
    if (node.type === "comment") {
      const found = node.data.match(text);
      if (found?.length > 0) {
        //   node.data = "";
        $(node).remove();
      }
    }
  });
}

function traverseTree(node, fn) {
  if (node) {
    fn(node);

    const children = node.children;

    if (children) {
      children.forEach((child) => {
        traverseTree(child, fn);
      });
    }
  }
}
