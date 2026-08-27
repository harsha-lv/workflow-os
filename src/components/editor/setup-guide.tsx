"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SetupGuide({
  open,
  onTest,
  onPublish,
  onDismiss,
}: {
  open: boolean;
  onTest: () => void;
  onPublish: () => void;
  onDismiss: () => void;
}) {
  if (!open) return null;
  return (
    <div className="border-b border-border bg-bg-elevated px-3 py-2">
      <p className="text-[12px] font-medium">Next steps</p>
      <ol className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
        <li>1. Review the path</li>
        <li>2. Configure AI if needed</li>
        <li>3. Test with sample data</li>
        <li>4. Publish when you are ready</li>
      </ol>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={onTest}>
          Test workflow
        </Button>
        <Button size="sm" onClick={onPublish}>
          Review & publish
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <Link href="/integrations">Integrations</Link>
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
