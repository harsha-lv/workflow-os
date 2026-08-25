import { Skeleton } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="mx-auto grid max-w-6xl gap-3">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-[4.5rem] w-full" />
      <div className="grid gap-3 lg:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}
