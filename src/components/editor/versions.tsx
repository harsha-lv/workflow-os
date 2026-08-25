"use client";

import { useEffect, useState } from "react";

type Version = { id: string; version: number; createdAt: string };

export function VersionList({ workflowId }: { workflowId: string }) {
  const [versions, setVersions] = useState<Version[]>([]);
  useEffect(() => {
    void fetch(`/api/workflows/${workflowId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const rows = (data?.versions ?? []) as Array<{ id: string; version: number; createdAt: string }>;
        setVersions(rows.slice(0, 6));
      });
  }, [workflowId]);
  if (versions.length < 2) return null;
  return (
    <p className="hidden text-[11px] text-faint md:block" title="Executions always use the published version.">
      v{versions[0]?.version} draft · {versions.length} versions
    </p>
  );
}
