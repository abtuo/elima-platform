import { PedagogicalResourceBundleSchema, type PedagogicalBlock, type PedagogicalResourceBundle } from "@elima/pedagogy";

export function cloneBundle(bundle: PedagogicalResourceBundle): PedagogicalResourceBundle {
  return structuredClone(bundle);
}

export function moveBlock(bundle: PedagogicalResourceBundle, blockId: string, direction: -1 | 1) {
  const copy = cloneBundle(bundle);
  const index = copy.document.blocks.findIndex((block) => block.id === blockId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= copy.document.blocks.length) return copy;
  [copy.document.blocks[index], copy.document.blocks[target]] = [copy.document.blocks[target], copy.document.blocks[index]];
  return copy;
}

export function removeBlock(bundle: PedagogicalResourceBundle, blockId: string) {
  const copy = cloneBundle(bundle);
  copy.document.blocks = copy.document.blocks.filter((block) => block.id !== blockId);
  if (copy.document.blocks.length === 0) return bundle;
  if (copy.document.blocks.every((block) => block.type !== "question")) copy.secrets.corrections = [];
  else copy.secrets.corrections = copy.secrets.corrections.filter((correction) => copy.document.blocks.some((block) => block.type === "question" && block.question.id === correction.questionId));
  return copy;
}

export function replaceBlock(bundle: PedagogicalResourceBundle, block: PedagogicalBlock) {
  const copy = cloneBundle(bundle);
  copy.document.blocks = copy.document.blocks.map((item) => item.id === block.id ? block : item);
  return copy;
}

export function createBasicBlock(type: "heading" | "rich_text" | "definition" | "callout" | "formula" | "summary", id = `block.${crypto.randomUUID()}`): PedagogicalBlock {
  if (type === "heading") return { id, type, level: 2, text: "Nouvelle section" };
  if (type === "rich_text") return { id, type, markdown: "Nouveau contenu" };
  if (type === "definition") return { id, type, term: "Notion", markdown: "Définition à compléter" };
  if (type === "callout") return { id, type, tone: "info", title: "À noter", markdown: "Information à compléter" };
  if (type === "formula") return { id, type, latex: "x = 0", display: true };
  return { id, type, title: "À retenir", items: ["Point essentiel"] };
}

export function appendBlock(bundle: PedagogicalResourceBundle, block: PedagogicalBlock) {
  const copy = cloneBundle(bundle);
  copy.document.blocks.push(block);
  return copy;
}

export function validateEditedBundle(bundle: PedagogicalResourceBundle) {
  return PedagogicalResourceBundleSchema.safeParse(bundle);
}

