import { Resvg } from "@resvg/resvg-js";
import { mathjax } from "@mathjax/src/js/mathjax.js";
import { TeX } from "@mathjax/src/js/input/tex.js";
import { SVG } from "@mathjax/src/js/output/svg.js";
import { liteAdaptor } from "@mathjax/src/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "@mathjax/src/js/handlers/html.js";
import "@mathjax/src/js/util/asyncLoad/esm.js";
import "@mathjax/src/js/input/tex/base/BaseConfiguration.js";
import "@mathjax/src/js/input/tex/ams/AmsConfiguration.js";
import "@mathjax/src/js/input/tex/newcommand/NewcommandConfiguration.js";
import "@mathjax/src/js/input/tex/noundefined/NoUndefinedConfiguration.js";

const adaptor = liteAdaptor({ fontSize: 16 });
RegisterHTMLHandler(adaptor);
const tex = new TeX({ packages: ["base", "ams", "newcommand", "noundefined"], formatError(_jax, error) { throw error; } });
const svg = new SVG({ fontCache: "none", exFactor: 0.5 });
const document = mathjax.document("", { InputJax: tex, OutputJax: svg });

export async function renderLatexPng(latex) {
  const node = await document.convertPromise(String(latex), { display: true, em: 16, ex: 8, containerWidth: 1280 });
  const markup = adaptor.outerHTML(node);
  const start = markup.indexOf("<svg"); const end = markup.lastIndexOf("</svg>");
  if (start < 0 || end < start) throw new Error("MathJax n’a produit aucun SVG.");
  const renderer = new Resvg(markup.slice(start, end + 6), {
    background: "rgba(255,255,255,0)",
    fitTo: { mode: "zoom", value: 3 },
  });
  const rendered = renderer.render();
  return { png: rendered.asPng(), width: rendered.width, height: rendered.height };
}
