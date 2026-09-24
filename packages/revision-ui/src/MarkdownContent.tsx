import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "./utils";

export type MarkdownContentProps = {
  content: string;
  variant?: "default" | "sheet";
  className?: string;
  inline?: boolean;
};

export function normalizeRevisionMarkdown(raw: string) {
  if (!raw) return "";
  let content = raw.replace(/\u0000/g, "").replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ");
  content = content
    .replace(/\\\(\s*\\\(([\s\S]*?)\\\)\s*\\\)/g, String.raw`\($1\)`)
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, formula: string) => `\n$$\n${formula.trim()}\n$$\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, formula: string) => `$${formula.trim()}$`)
    .replace(/\\n(?![A-Za-z])/g, "\n");
  return content.trim();
}

export function MarkdownContent({ content, variant = "default", className, inline = false }: MarkdownContentProps) {
  return (
    <div className={cn(
      "min-w-0 max-w-full break-words [&_.katex-display]:max-w-full [&_.katex-display]:overflow-x-auto [&_pre]:max-w-full [&_pre]:overflow-x-auto",
      variant === "sheet" ? "sheet-markdown" : "prose prose-sm max-w-none",
      inline && "inline-markdown inline",
      className,
    )}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={inline ? { p: ({ children }) => <span>{children}</span> } : undefined}
      >
        {normalizeRevisionMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
}

export function MarkdownMathText({ content, inline = false, className }: { content: string; inline?: boolean; className?: string }) {
  return <MarkdownContent content={content} inline={inline} className={className} />;
}
