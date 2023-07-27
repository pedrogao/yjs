import { readFileSync } from "fs";
import { ContentAny, XmlText, Doc, applyUpdate } from "../src/index.js";

/**
 * escape
 * @param {string} str
 */
const escape = (str) =>
  str
    .replaceAll('"', '\\"')
    .replaceAll('\\\\"', '\\"')
    .replaceAll("{", "\\{")
    .replaceAll("}", "\\}")
    .substring(0, 20);

const parentStr = (parent) => {
  if (parent) {
    if (parent._item) {
      return getId(parent._item);
    } else {
      return "root";
    }
  } else {
    return "null";
  }
};

/**
 * Convenient helper to view type information.
 *
 * Do not use in productive systems as the output can be immense!
 *
 * @param {Array<AbstractType<any>>} items
 */
export const viewType = (items) => {
  const nodes = [];
  const edegs = [];
  let edgeId = 0;

  /**
   * @param {Item | null} n
   */
  const resolve = (n) => {
    const id = getId(n);
    // left right originLeft originRight
    const parent = parentStr(n.parent);
    const attrs = [
      `<f0>${id}`,
      `<f1>${escape(getContent(n))}`,
      `<f2>${n.length}`,
      `<f3>${n.deleted}`,
      `<f4>l: ${getId(n.left)}`,
      `<f5>r: ${getId(n.right)}`,
      `<f6>ol: ${strId(n.origin)}`,
      `<f7>or: ${strId(n.rightOrigin)}`,
      `<f8>p: ${parent}`,
    ];
    const nodeTpl = `"${id}" [
        label = "${attrs.join(" | ")}"
        shape = "record"
        ];`;
    nodes.push(nodeTpl);

    if (n.left) {
      edegs.push(`
        "${id}":f4 -> "${getId(n.left)}":f0 [
          id = ${edgeId++}
          ];
        `);
    }

    if (n.right) {
      edegs.push(`
        "${id}":f5 -> "${getId(n.right)}":f0 [
          id = ${edgeId++}
          ];
        `);
    }

    if (n.origin) {
      edegs.push(`
        "${id}":f6 -> "${strId(n.origin)}":f0 [
          id = ${edgeId++}
          ];
        `);
    }

    if (n.rightOrigin) {
      edegs.push(`
        "${id}":f7 -> "${strId(n.rightOrigin)}":f0 [
          id = ${edgeId++}
          ];
        `);
    }

    if (n.parent) {
      if (n.parent._item) {
        edegs.push(`
        "${id}":f8 -> "${getId(n.parent._item)}":f0 [
          id = ${edgeId++}
          ];
        `);
      } else {
        edegs.push(`
        "${id}":f8 -> "root":f0 [
          id = ${edgeId++}
          ];
        `);
      }
    }
  };

  for (const item of items) {
    resolve(item);
  }

  const graph = `digraph g {
    
    graph [
    rankdir = "LR"
    ];

    "root" [
      label = "<f0>root | <f1>\\<XmlText\\> "
      shape = "record"
    ];
    
    ${nodes.join("\n")}

    ${edegs.join("\n")}
  }
    `;

  return graph;
};

/**
 * @param {Item | null} n
 */
const getId = (n) => (n ? `${n.id.client}-${n.id.clock}` : "null");

/**
 * @param {ID | null} id
 */
const strId = (id) => (id ? `${id.client}-${id.clock}` : "null");

/**
 * @param {Item} node
 * @ts-ignore
 */
const getContent = (node) => {
  if (!node.content) {
    return "GC";
  }
  if (node.content.str) {
    return JSON.stringify(node.content.str);
  }
  if (node.content.key) {
    return node.content.value
      ? "\\<" + node.content.key + " " + JSON.stringify(node.content.value)
      : node.content.key + "\\>";
  }
  if (node.content.len) {
    return node.content.len.toString();
  }
  if (node.content.type && node.content.type instanceof XmlText) {
    return "\\<XmlText\\>";
  }
  if (node.content instanceof ContentAny) {
    return node.parentSub
      ? node.parentSub + "-" + node.content.arr[0]
      : node.content.arr[0];
  }
  return JSON.stringify(node.content);
};

const main = async () => {
  const data = readFileSync("examples/1.bin").toString();
  const buf = Buffer.from(data, "base64");
  const doc = new Doc();
  const content = doc.get("content", XmlText);
  applyUpdate(doc, buf);

  const allItems = [];
  doc.store.clients.forEach((items, client) => {
    allItems.push(...items);
  });

  console.log(viewType(allItems));
};

main();
