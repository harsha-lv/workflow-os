import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section";
import { START_EXAMPLES } from "@/domain/start-examples";

export function QuickStart({ empty }: { empty: boolean }) {
  return (
    <section className="panel mt-5 p-5">
      <SectionLabel>{empty ? "Let's build your first workflow" : "What do you want to automate?"}</SectionLabel>
      <p className="mt-2 max-w-2xl text-[13px] text-muted">
        {empty
          ? "Describe what you want. FlowForge can draft the path. You review, test, and publish — nothing runs until you say so."
          : "Describe it with AI, start from a template, or build from scratch. Existing operations stay below."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/workflows/new/ai">Describe it with AI</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/templates">Start from template</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/workflows/new">Build from scratch</Link>
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {START_EXAMPLES.map((example) => (
          <Link
            key={example.label}
            href={`/workflows/new/ai?prompt=${encodeURIComponent(example.prompt)}`}
            className="rounded-md border border-border bg-bg-sunken px-2.5 py-1.5 text-[12px] text-muted transition-colors hover:border-border-strong hover:text-text"
          >
            {example.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
