import { getNodeDefinition } from "@/domain/nodes/definitions";
import { NodeIcon } from "@/components/nodes/icon";
import { cn } from "@/lib/utils";

export function WorkflowPath({
  nodes,
  className,
}: {
  nodes: Array<{ type: string; name: string }>;
  className?: string;
}) {
  const shown = nodes.slice(0, 6);
  const extra = nodes.length - shown.length;
  return (
    <div className={cn("flex flex-wrap items-center gap-x-1 gap-y-1 text-[11px] text-muted", className)}>
      {shown.map((node, index) => {
        const def = getNodeDefinition(node.type);
        return (
          <span key={`${node.type}-${index}`} className="inline-flex items-center gap-1">
            {index > 0 ? <span className="text-faint">→</span> : null}
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-bg-sunken px-1.5 py-0.5">
              <NodeIcon name={def?.icon ?? "Sparkles"} className="size-3 text-faint" />
              <span className="max-w-[9rem] truncate">{def?.name ?? node.name}</span>
            </span>
          </span>
        );
      })}
      {extra > 0 ? <span className="text-faint">+{extra}</span> : null}
    </div>
  );
}
