import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { MarketingHeader } from "@/components/ui/MarketingHeader";

export const metadata: Metadata = {
  title: "Conditions générales de vente | Elima Tech",
  description:
    "Conditions générales de vente applicables aux services et abonnements Elima proposés par Elima Tech.",
};

const source = readFileSync(join(process.cwd(), "src", "content", "cgv.md"), "utf8");
const sourceLines = source.replace(/\r\n/g, "\n").split("\n");
const documentTitle = sourceLines[0].replace(/^#\s+/, "");
const documentVersion = sourceLines[2].replaceAll("**", "");
const documentBody = sourceLines.slice(4).join("\n");
const sectionTitles = sourceLines
  .filter((line) => line.startsWith("## "))
  .map((line) => line.slice(3));

function articleId(title: string) {
  const number = title.match(/^(\d+)\./)?.[1];
  return number ? `article-${number}` : undefined;
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyPrefix}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function renderMarkdown(markdown: string) {
  const lines = markdown.split("\n");
  const blocks: ReactNode[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;

    if (line.startsWith("## ")) {
      const title = line.slice(3);
      blocks.push(
        <h2
          id={articleId(title)}
          key={`heading-${index}`}
          className="scroll-mt-28 border-t border-slate-100 pt-8 text-2xl font-bold text-[var(--accent)] first:border-0 first:pt-0"
        >
          {title}
        </h2>,
      );
      continue;
    }

    if (line.startsWith("* ")) {
      const items: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("* ")) {
        items.push(lines[index].trim().slice(2));
        index += 1;
      }
      index -= 1;
      blocks.push(
        <ul key={`list-${index}`} className="list-disc space-y-2 pl-6">
          {items.map((item, itemIndex) => (
            <li key={`${itemIndex}-${item}`}>
              {renderInline(item, `list-${index}-${itemIndex}`)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s/, ""));
        index += 1;
      }
      index -= 1;
      blocks.push(
        <ol key={`ordered-list-${index}`} className="list-decimal space-y-2 pl-6">
          {items.map((item, itemIndex) => (
            <li key={`${itemIndex}-${item}`}>
              {renderInline(item, `ordered-${index}-${itemIndex}`)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    blocks.push(
      <p key={`paragraph-${index}`}>{renderInline(line, `paragraph-${index}`)}</p>,
    );
  }

  return blocks;
}

export default function TermsOfSalePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <MarketingHeader />

        <header className="mt-6 overflow-hidden rounded-[32px] border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/70 to-sky-50 p-6 shadow-sm md:p-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">
            Informations contractuelles
          </p>
          <h1 className="mt-3 text-4xl font-bold text-[var(--accent)] md:text-5xl">
            {documentTitle}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            {documentVersion}
          </p>
        </header>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
          <nav
            aria-label="Sommaire des conditions générales de vente"
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-28"
          >
            <p className="font-semibold text-[var(--accent)]">Sommaire</p>
            <ol className="mt-4 max-h-[65vh] space-y-2 overflow-auto pr-2 text-sm text-slate-600">
              {sectionTitles.map((title) => (
                <li key={title}>
                  <a
                    className="hover:text-[var(--primary)]"
                    href={`#${articleId(title)}`}
                  >
                    {title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="space-y-6 rounded-[32px] border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-600 shadow-sm md:p-10 md:text-base">
            {renderMarkdown(documentBody)}
          </article>
        </div>

        <footer className="py-10 text-center text-sm text-slate-500">
          <Link className="font-medium hover:text-[var(--primary)]" href="/">
            Retour à l’accueil
          </Link>
        </footer>
      </main>
    </div>
  );
}
