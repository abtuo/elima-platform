import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";

type MarkdownContentProps = {
  content: string;
  variant?: "default" | "sheet";
  className?: string;
};

export function MarkdownContent({ content, variant = "default", className }: MarkdownContentProps) {
  return (
    <div className={cn(variant === "sheet" ? "sheet-markdown" : "prose prose-sm max-w-none", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function MarkdownMathText({ content }: { content: string }) {
  return <MarkdownContent content={content} />;
}
