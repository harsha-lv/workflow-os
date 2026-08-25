"use client";

import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-16">
      <h1 className="text-xl font-semibold">This screen failed to load</h1>
      <p className="mt-2 text-sm text-muted">
        Your data was not changed. Retry, or go back and open the page again.
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
