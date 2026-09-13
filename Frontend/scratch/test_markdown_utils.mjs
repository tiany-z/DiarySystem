import { markdownToHtml } from "../src/utils/markdownUtils.ts";

const md = "```mermaid\ngraph TD\nA --> B\n```";
console.log("markdownToHtml result:\n", markdownToHtml(md));
