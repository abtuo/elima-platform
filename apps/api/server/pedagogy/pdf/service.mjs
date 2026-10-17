import { readFile } from "node:fs/promises";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { buildChartGeometry, buildDiagramGeometry } from "../../../../../packages/pedagogy/src/index.ts";
import { renderLatexPng } from "./latex.mjs";

const A4 = [595.28, 841.89];
const MARGIN = 46;
const CONTENT_WIDTH = A4[0] - MARGIN * 2;
const COLORS = {
  primary: rgb(0.10, 0.43, 0.28), accent: rgb(0.10, 0.14, 0.20), muted: rgb(0.39, 0.44, 0.52),
  line: rgb(0.84, 0.87, 0.90), light: rgb(0.96, 0.98, 0.97), white: rgb(1, 1, 1), warning: rgb(0.99, 0.95, 0.82),
};

export function toPdfSafeText(value) {
  return String(value ?? "").replace(/[\u202f\u00a0]/g, " ").replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d«»]/g, '"').replace(/[•·]/g, "-")
    .replace(/→|⇒|⟹/g, "=>").replace(/≠/g, "!=").replace(/≤/g, "<=").replace(/≥/g, ">=")
    .replace(/α/g, "alpha").replace(/β/g, "beta").replace(/Δ/g, "Delta").replace(/δ/g, "delta");
}

export function latexToReadable(value) {
  let text = String(value ?? "");
  for (let index = 0; index < 8; index += 1) text = text.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)");
  return toPdfSafeText(text.replace(/\\(?:Longrightarrow|Rightarrow|implies)/g, " => ").replace(/\\neq/g, " != ")
    .replace(/\\(?:quad|qquad)/g, "  ").replace(/\\text\{([^{}]+)\}/g, "$1").replace(/\\,/g, " ")
    .replace(/\\times/g, " x ").replace(/\\div/g, " / ").replace(/\\cdot/g, " . ")
    .replace(/\\\{/g, "[").replace(/\\\}/g, "]").replace(/[{}]/g, "").replace(/\$/g, ""));
}

export function markdownToPdfText(value) {
  return latexToReadable(String(value ?? "").replace(/!\[[^\]]*\]\([^)]*\)/g, "[illustration]")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/[*_#>|~]/g, "").trim());
}

function wrap(text, font, size, maxWidth) {
  const paragraphs = String(text).split(/\r?\n/); const lines = [];
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) { lines.push(""); continue; }
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
      else { if (line) lines.push(line); line = word; }
    }
    if (line) lines.push(line);
  }
  return lines;
}

export async function loadElimaLogo() {
  try { return await readFile(new URL("../../../../../packages/branding/public/logo.png", import.meta.url)); }
  catch { return null; }
}

export async function buildPedagogicalPdf(view, options = {}) {
  const teacher = view.audience === "teacher_print";
  const pdf = await PDFDocument.create();
  pdf.setTitle(toPdfSafeText(view.document.metadata.title));
  pdf.setAuthor("Elima"); pdf.setCreator("Elima Assistant pédagogique"); pdf.setProducer("Elima PDF service");
  pdf.setSubject(toPdfSafeText(`${view.document.metadata.subject} - ${view.document.metadata.level}`));
  pdf.setKeywords(["Elima", "support pédagogique", teacher ? "enseignant" : "élève"]);
  pdf.setCreationDate(options.generatedAt ?? new Date()); pdf.setModificationDate(options.generatedAt ?? new Date());
  const regular = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const logoBytes = options.logoBytes ?? await loadElimaLogo();
  let logo = null; try { if (logoBytes) logo = await pdf.embedPng(logoBytes); } catch { logo = null; }
  const latexAssets = new Map();
  for (const block of view.document.blocks) if (block.type === "formula") {
    try { const rendered = await renderLatexPng(block.latex); latexAssets.set(block.id, { ...rendered, image: await pdf.embedPng(rendered.png) }); }
    catch { latexAssets.set(block.id, null); }
  }
  const pages = []; let page; let y;

  function newPage() {
    page = pdf.addPage(A4); pages.push(page); y = A4[1] - 90;
    page.drawRectangle({ x: 0, y: A4[1] - 68, width: A4[0], height: 68, color: COLORS.light });
    page.drawRectangle({ x: MARGIN, y: A4[1] - 72, width: CONTENT_WIDTH, height: 3, color: COLORS.primary });
    if (logo) { const scale = Math.min(72 / logo.width, 38 / logo.height); page.drawImage(logo, { x: MARGIN, y: A4[1] - 55, width: logo.width * scale, height: logo.height * scale }); }
    else page.drawText("ELIMA", { x: MARGIN, y: A4[1] - 44, font: bold, size: 19, color: COLORS.primary });
    page.drawText(teacher ? "VERSION ENSEIGNANT" : "VERSION ELEVE", { x: A4[0] - MARGIN - 118, y: A4[1] - 42, font: bold, size: 9, color: COLORS.primary });
  }
  const ensure = (height) => { if (!page || y - height < 58) newPage(); };
  const line = (text, config = {}) => {
    const size = config.size ?? 10; const font = config.font ?? regular; const color = config.color ?? COLORS.accent;
    const leading = config.leading ?? size * 1.35; const indent = config.indent ?? 0; const maxWidth = config.width ?? CONTENT_WIDTH - indent;
    const lines = wrap(toPdfSafeText(text), font, size, maxWidth);
    for (const item of lines) { ensure(leading + 2); if (item) page.drawText(item, { x: MARGIN + indent, y, size, font, color }); y -= leading; }
    y -= config.after ?? 2; return lines.length;
  };
  const heading = (text, level = 2) => { const size = level <= 2 ? 15 : 12; ensure(size * 2.3); y -= level <= 2 ? 7 : 3; line(latexToReadable(text), { size, font: bold, color: COLORS.primary, leading: size * 1.3, after: 5 }); };
  const box = (height, color = COLORS.light) => { ensure(height); page.drawRectangle({ x: MARGIN, y: y - height + 8, width: CONTENT_WIDTH, height, color, borderColor: COLORS.line, borderWidth: 0.7 }); };

  newPage();
  const metadata = view.document.metadata;
  line(metadata.title, { size: 23, font: bold, color: COLORS.accent, leading: 27, after: 5 });
  line(`${metadata.subject} | ${metadata.level}${metadata.track ? ` | ${metadata.track}` : ""} | ${metadata.chapter}`, { size: 10, font: bold, color: COLORS.primary, after: 6 });
  line(metadata.description, { size: 10.5, color: COLORS.muted, after: 9 });
  box(34 + metadata.objectives.length * 14);
  line("OBJECTIFS PEDAGOGIQUES", { size: 9, font: bold, color: COLORS.primary, indent: 12, width: CONTENT_WIDTH - 24, after: 4 });
  for (const objective of metadata.objectives) line(`- ${objective.label}`, { size: 9.5, indent: 12, width: CONTENT_WIDTH - 24, after: 1 });
  y -= 12;
  if (metadata.validationStatus !== "validated") { box(34, COLORS.warning); line("Contenu scientifique a valider par l'enseignant avant diffusion.", { size: 9, font: bold, indent: 10, width: CONTENT_WIDTH - 20, after: 10 }); }

  const corrections = new Map(teacher ? view.secrets.corrections.map((item) => [item.questionId, item]) : []);
  for (const block of view.document.blocks) {
    if (block.type === "heading") { heading(block.text, block.level); continue; }
    if (block.type === "rich_text") { line(markdownToPdfText(block.markdown), { size: 10.3, leading: 14, after: 7 }); continue; }
    if (block.type === "definition" || block.type === "callout") { const title = block.type === "definition" ? block.term : (block.title ?? "A retenir"); const body = block.markdown; const lines = wrap(markdownToPdfText(body), regular, 9.5, CONTENT_WIDTH - 24); const height = 34 + lines.length * 13; ensure(Math.min(height, 220)); box(Math.min(height, 220), block.type === "callout" && block.tone === "warning" ? COLORS.warning : COLORS.light); line(title, { size: 10, font: bold, color: COLORS.primary, indent: 12, width: CONTENT_WIDTH - 24, after: 3 }); line(markdownToPdfText(body), { size: 9.5, indent: 12, width: CONTENT_WIDTH - 24, leading: 13, after: 9 }); continue; }
    if (block.type === "formula") {
      const asset = latexAssets.get(block.id);
      if (asset) {
        const scale = Math.min((CONTENT_WIDTH - 24) / asset.width, 27 / asset.height);
        const imageWidth = asset.width * scale; const imageHeight = asset.height * scale; const height = Math.max(58, imageHeight + 31);
        ensure(height + 8); box(height); line(block.label ?? "Formule", { size: 8.5, font: bold, color: COLORS.muted, indent: 12, after: 4 });
        page.drawImage(asset.image, { x: MARGIN + 12, y: y - imageHeight + 4, width: imageWidth, height: imageHeight }); y -= imageHeight + 15;
      } else { ensure(66); box(58); line(block.label ?? "Formule", { size: 8.5, font: bold, color: COLORS.muted, indent: 12, after: 6 }); line(latexToReadable(block.latex), { size: 13, font: bold, indent: 12, width: CONTENT_WIDTH - 24, after: 13 }); }
      continue;
    }
    if (block.type === "worked_example") { heading(block.title, 3); line(markdownToPdfText(block.promptMarkdown), { size: 10, after: 4 }); block.steps.forEach((step, index) => line(`${index + 1}. ${step.title ? `${step.title}: ` : ""}${markdownToPdfText(step.markdown)}`, { size: 9.5, indent: 10, width: CONTENT_WIDTH - 10, after: 3 })); if (block.conclusionMarkdown) line(markdownToPdfText(block.conclusionMarkdown), { size: 9.5, font: bold, after: 7 }); continue; }
    if (block.type === "summary") { heading(block.title ?? "A retenir", 3); block.items.forEach((item) => line(`- ${markdownToPdfText(item)}`, { size: 9.5, indent: 8, width: CONTENT_WIDTH - 8, after: 2 })); y -= 4; continue; }
    if (block.type === "table") { drawTable(block); continue; }
    if (block.type === "chart") { drawChart(block); continue; }
    if (block.type === "diagram") { drawDiagram(block); continue; }
    if (block.type === "image") { ensure(90); heading(block.caption ?? "Illustration", 3); box(58, COLORS.warning); line(block.uri ? `Illustration referencee: ${block.alt}` : `Asset indisponible - ${block.alt}`, { size: 9.5, font: bold, indent: 10, width: CONTENT_WIDTH - 20, after: 8 }); continue; }
    if (block.type === "question") { drawQuestion(block.question, corrections.get(block.question.id)); continue; }
    if (block.type === "exercise_group" || block.type === "guided_activity" || block.type === "assessment" || block.type === "document_analysis") {
      heading(block.title, 3);
      if ("introductionMarkdown" in block && block.introductionMarkdown) line(markdownToPdfText(block.introductionMarkdown), { size: 9.5 });
      if (block.type === "guided_activity") block.steps.forEach((step, index) => line(`${index + 1}. ${step.title}: ${markdownToPdfText(step.instructionMarkdown)}`, { size: 9.5, indent: 8 }));
      if (block.type === "assessment") line(`Bareme: ${block.declaredPoints} points sur ${block.scale}.`, { size: 9.5, font: bold });
    }
  }

  if (metadata.references.length) { heading("References documentaires", 2); metadata.references.forEach((reference, index) => line(`${index + 1}. ${reference.title}${reference.publisher ? ` - ${reference.publisher}` : ""}${reference.license ? ` - ${reference.license}` : ""} [${reference.status}]`, { size: 8.2, color: COLORS.muted, after: 2 })); }

  pages.forEach((item, index) => {
    item.drawLine({ start: { x: MARGIN, y: 40 }, end: { x: A4[0] - MARGIN, y: 40 }, color: COLORS.line, thickness: 0.7 });
    item.drawText("Elima - support pedagogique", { x: MARGIN, y: 24, size: 8, font: regular, color: COLORS.muted });
    const label = `${index + 1} / ${pages.length}`; item.drawText(label, { x: A4[0] - MARGIN - regular.widthOfTextAtSize(label, 8), y: 24, size: 8, font: regular, color: COLORS.muted });
  });
  return pdf.save({ useObjectStreams: false });

  function drawTable(block) {
    ensure(76); heading(block.title ?? "Tableau", 3); const colWidth = CONTENT_WIDTH / block.columns.length; const headerHeight = 30;
    const drawHeader = () => { ensure(headerHeight + 18); page.drawRectangle({ x: MARGIN, y: y - headerHeight + 7, width: CONTENT_WIDTH, height: headerHeight, color: COLORS.primary }); block.columns.forEach((column, index) => { const label = `${column.label}${column.unit ? ` (${column.unit})` : ""}`; const lines = wrap(label, bold, 7.5, colWidth - 8).slice(0, 2); lines.forEach((value, lineIndex) => page.drawText(value, { x: MARGIN + index * colWidth + 4, y: y - lineIndex * 9, size: 7.5, font: bold, color: COLORS.white })); }); y -= headerHeight; };
    drawHeader();
    for (const row of block.rows) {
      const cells = row.cells.map((cell) => wrap(toPdfSafeText(cell === null ? "-" : cell), regular, 7.8, colWidth - 8));
      const rowHeight = Math.max(22, Math.max(...cells.map((lines) => lines.length)) * 10 + 8);
      if (y - rowHeight < 58) { newPage(); drawHeader(); }
      page.drawRectangle({ x: MARGIN, y: y - rowHeight + 7, width: CONTENT_WIDTH, height: rowHeight, color: COLORS.white, borderColor: COLORS.line, borderWidth: 0.5 });
      cells.forEach((lines, columnIndex) => lines.forEach((value, lineIndex) => page.drawText(value, { x: MARGIN + columnIndex * colWidth + 4, y: y - lineIndex * 10, size: 7.8, font: regular, color: COLORS.accent })));
      y -= rowHeight;
    }
    if (block.caption) line(block.caption, { size: 8, font: italic, color: COLORS.muted, after: 8 }); else y -= 8;
  }

  function drawChart(block) {
    ensure(330); heading(block.title, 3); const geometry = buildChartGeometry(block, 720, 360); const scale = CONTENT_WIDTH / geometry.width; const originY = y - geometry.height * scale;
    page.drawRectangle({ x: MARGIN, y: originY, width: CONTENT_WIDTH, height: geometry.height * scale, color: COLORS.white, borderColor: COLORS.line, borderWidth: 0.7 });
    const px = (x) => MARGIN + x * scale; const py = (chartY) => originY + (geometry.height - chartY) * scale;
    geometry.yTicks.forEach((tick) => { const gy = geometry.plot.bottom - ((tick - geometry.yMin) / (geometry.yMax - geometry.yMin)) * (geometry.plot.bottom - geometry.plot.top); page.drawLine({ start: { x: px(geometry.plot.left), y: py(gy) }, end: { x: px(geometry.plot.right), y: py(gy) }, color: COLORS.line, thickness: 0.5 }); page.drawText(String(Number(tick.toPrecision(3))), { x: px(geometry.plot.left) - 30, y: py(gy) - 3, size: 6.5, font: regular, color: COLORS.muted }); });
    page.drawLine({ start: { x: px(geometry.plot.left), y: py(geometry.plot.top) }, end: { x: px(geometry.plot.left), y: py(geometry.plot.bottom) }, color: COLORS.accent, thickness: 1 });
    page.drawLine({ start: { x: px(geometry.plot.left), y: py(geometry.plot.bottom) }, end: { x: px(geometry.plot.right), y: py(geometry.plot.bottom) }, color: COLORS.accent, thickness: 1 });
    geometry.xTicks.forEach((tick) => page.drawText(toPdfSafeText(tick.label).slice(0, 12), { x: px(tick.x) - 5, y: py(geometry.plot.bottom) - 14, size: 6.5, font: regular, color: COLORS.muted }));
    const colors = [COLORS.primary, rgb(0.43, 0.26, 0.78), rgb(0.85, 0.45, 0.04), rgb(0.02, 0.41, 0.63)];
    geometry.series.forEach((series, seriesIndex) => { const color = colors[seriesIndex % colors.length]; series.points.forEach((point, index) => { if (block.chartType !== "scatter" && index) page.drawLine({ start: { x: px(series.points[index - 1].x), y: py(series.points[index - 1].y) }, end: { x: px(point.x), y: py(point.y) }, color, thickness: 1.8 }); if (block.chartType === "bar") page.drawRectangle({ x: px(point.x) - 6 + seriesIndex * 4, y: py(geometry.plot.bottom), width: 10, height: py(point.y) - py(geometry.plot.bottom), color }); else page.drawCircle({ x: px(point.x), y: py(point.y), size: 2.7, color }); }); });
    page.drawText(toPdfSafeText(`${block.xAxis.label}${block.xAxis.unit ? ` (${block.xAxis.unit})` : ""}`), { x: MARGIN + 190, y: originY + 7, size: 7.5, font: bold, color: COLORS.muted });
    page.drawText(toPdfSafeText(`${block.yAxis.label}${block.yAxis.unit ? ` (${block.yAxis.unit})` : ""}`), { x: MARGIN + 4, y: originY + geometry.height * scale - 12, size: 7.5, font: bold, color: COLORS.muted });
    y = originY - 8; geometry.series.forEach((series, index) => line(`${index + 1}. ${series.label}`, { size: 7.5, color: colors[index % colors.length], after: 0 })); if (block.caption) line(block.caption, { size: 8, font: italic, color: COLORS.muted, after: 8 });
  }

  function drawDiagram(block) {
    const geometry = buildDiagramGeometry(block, 720); const scale = CONTENT_WIDTH / geometry.width; const diagramHeight = geometry.height * scale; ensure(Math.min(diagramHeight + 105, 700)); heading(block.title, 3); line(markdownToPdfText(block.descriptionMarkdown), { size: 9, color: COLORS.muted, after: 4 }); const originY = y - diagramHeight;
    const px = (x) => MARGIN + x * scale; const py = (dy) => originY + (geometry.height - dy) * scale;
    geometry.edges.forEach((edge) => page.drawLine({ start: { x: px(edge.x1), y: py(edge.y1) }, end: { x: px(edge.x2), y: py(edge.y2) }, color: COLORS.muted, thickness: 1.2 }));
    geometry.nodes.forEach((node, index) => { const nx = px(node.x); const ny = py(node.y + node.height); const nw = node.width * scale; const nh = node.height * scale; page.drawRectangle({ x: nx, y: ny, width: nw, height: nh, color: COLORS.white, borderColor: COLORS.primary, borderWidth: 1 }); page.drawCircle({ x: nx + 10, y: ny + nh - 10, size: 7, color: COLORS.primary }); page.drawText(String(index + 1), { x: nx + 8, y: ny + nh - 12.5, size: 6.5, font: bold, color: COLORS.white }); wrap(toPdfSafeText(node.label), bold, 7.2, nw - 12).slice(0, 2).forEach((value, lineIndex) => page.drawText(value, { x: nx + 6, y: ny + nh - 25 - lineIndex * 9, size: 7.2, font: bold, color: COLORS.accent })); });
    y = originY - 7; geometry.nodes.forEach((node, index) => line(`${index + 1}. ${node.label}${node.description ? ` - ${node.description}` : ""}`, { size: 7.8, after: 1 })); if (block.caption) line(block.caption, { size: 8, font: italic, color: COLORS.muted, after: 8 });
  }

  function drawQuestion(question, correction) {
    const promptLines = wrap(markdownToPdfText(question.promptMarkdown), regular, 9.7, CONTENT_WIDTH - 20); const estimated = 42 + promptLines.length * 13 + (question.options?.length ?? 0) * 15 + (!teacher && view.print.includeAnswerSpaces ? 54 : 0); ensure(Math.min(estimated, 300));
    page.drawRectangle({ x: MARGIN, y: y - 19, width: CONTENT_WIDTH, height: 25, color: COLORS.light, borderColor: COLORS.line, borderWidth: 0.6 });
    page.drawText(toPdfSafeText(question.title ?? "Question"), { x: MARGIN + 9, y: y - 10, size: 10, font: bold, color: COLORS.accent }); const badge = `${question.points} pt`; page.drawText(badge, { x: A4[0] - MARGIN - bold.widthOfTextAtSize(badge, 7.5) - 8, y: y - 9, size: 7.5, font: bold, color: COLORS.primary }); y -= 33;
    line(markdownToPdfText(question.promptMarkdown), { size: 9.7, indent: 5, width: CONTENT_WIDTH - 10, leading: 13, after: 4 });
    question.options?.forEach((option, index) => line(`${String.fromCharCode(65 + index)}. ${markdownToPdfText(option.labelMarkdown)}`, { size: 9.2, indent: 12, width: CONTENT_WIDTH - 15, after: 1 }));
    if (!teacher && view.print.includeAnswerSpaces) { ensure(47); for (let index = 0; index < (question.responseContract.kind === "steps" || question.responseContract.kind === "analysis" ? 4 : 2); index += 1) { page.drawLine({ start: { x: MARGIN + 10, y }, end: { x: A4[0] - MARGIN - 10, y }, color: COLORS.line, thickness: 0.6 }); y -= 15; } y -= 6; }
    if (teacher && correction) { ensure(55); page.drawRectangle({ x: MARGIN + 8, y: y - 20, width: CONTENT_WIDTH - 16, height: 27, color: rgb(0.90, 0.97, 0.93) }); line("CORRIGE ENSEIGNANT", { size: 8.5, font: bold, color: COLORS.primary, indent: 16, width: CONTENT_WIDTH - 32, after: 5 }); line(markdownToPdfText(correction.correctionMarkdown), { size: 9, indent: 16, width: CONTENT_WIDTH - 32, leading: 12, after: 4 }); correction.solutionSteps.forEach((step, index) => line(`${index + 1}. ${markdownToPdfText(step.markdown)}`, { size: 8.5, indent: 22, width: CONTENT_WIDTH - 38, after: 2 })); if (view.print.includeRubrics && correction.rubric.length) { line("Bareme", { size: 8.5, font: bold, indent: 16, after: 2 }); correction.rubric.forEach((item) => line(`- ${item.criterion}: ${item.points} pt`, { size: 8.2, indent: 22, after: 1 })); } if (view.print.includeTeacherComments && correction.teacherComments) line(`Note: ${correction.teacherComments}`, { size: 8.2, font: italic, indent: 16 }); }
    y -= 8;
  }
}
