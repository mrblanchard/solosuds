import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "a", "b", "br", "blockquote", "div", "em", "h1", "h2", "h3", "h4", "h5", "h6",
  "hr", "i", "img", "li", "ol", "p", "pre", "small", "span", "strong", "sub",
  "sup", "table", "tbody", "td", "th", "thead", "tr", "u", "ul", "font",
];

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions["allowedAttributes"] = {
  "*": ["style", "class", "align", "valign", "width", "height", "color"],
  a: ["href", "name", "target", "rel"],
  img: ["src", "alt", "width", "height"],
  font: ["face", "size", "color"],
  table: ["border", "cellpadding", "cellspacing"],
};

/**
 * Sanitizes HTML email content (inbound messages and org email signatures)
 * down to a safe subset of formatting tags. Strips scripts, styles, forms,
 * iframes, event handlers, and javascript: URLs.
 */
export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https", "cid", "data"] },
    disallowedTagsMode: "discard",
  });
}
