import {
  Bell,
  Bot,
  Braces,
  ClipboardList,
  Clock,
  CornerDownLeft,
  Eye,
  FileText,
  Filter,
  GitBranch,
  Globe,
  Mail,
  Merge,
  Play,
  Repeat,
  ScanText,
  ScrollText,
  Sparkles,
  Split,
  Tags,
  Timer,
  UserCheck,
  Variable,
  Wand2,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  Bell,
  Bot,
  Braces,
  ClipboardList,
  Clock,
  CornerDownLeft,
  Eye,
  FileText,
  Filter,
  GitBranch,
  Globe,
  Mail,
  Merge,
  Play,
  Repeat,
  ScanText,
  ScrollText,
  Sparkles,
  Split,
  Tags,
  Timer,
  UserCheck,
  Variable,
  Wand2,
  Webhook,
};

export function NodeIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon className={cn("size-3.5", className)} strokeWidth={1.75} />;
}
