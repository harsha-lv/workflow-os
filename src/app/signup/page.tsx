import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getContext } from "@/server/context";
import { publicSignupEnabled } from "@/server/config";

export default async function SignupPage() {
  const ctx = await getContext();
  if (ctx) redirect("/dashboard");
  if (!publicSignupEnabled()) {
    redirect("/login");
  }
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">FlowForge</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Create a workspace</h1>
      <p className="mt-2 text-sm text-muted">A workspace holds projects, workflows, secrets, and the audit log.</p>
      <AuthForm mode="signup" />
      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link className="text-text underline-offset-4 hover:underline" href="/login">
          Sign in
        </Link>
      </p>
    </main>
  );
}
