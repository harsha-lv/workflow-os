import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-accent">404</p>
      <h1 className="mt-3 text-4xl font-medium tracking-[-0.045em]">That page is not here</h1>
      <p className="mt-2 text-sm text-muted">It may have been moved, or the URL is incomplete.</p>
      <Link href="/dashboard" className="mt-6 text-sm text-accent hover:underline">
        Back to dashboard
      </Link>
    </main>
  );
}
