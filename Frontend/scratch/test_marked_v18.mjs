import { marked } from "../node_modules/marked/lib/marked.esm.js";

const renderer = {
  code({ text, lang }) {
    console.log("Renderer.code called! text:", text, "lang:", lang);
    return `<div class="code-block" data-lang="${lang}">${text}</div>`;
  }
};

marked.use({ renderer });

const md = "```mermaid\ngraph TD\nA --> B\n```";
const output = marked.parse(md);
console.log("Output:\n", output);
