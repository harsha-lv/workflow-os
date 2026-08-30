import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getContext } from "@/server/context";
import { getDemoEmail, publicSignupEnabled } from "@/server/config";
import { AuthFrame } from "@/components/layout/auth-frame";

export default async function LoginPage() {
  const ctx = await getContext();
  if (ctx) redirect("/dashboard");
  const demoEmail = getDemoEmail();
  return (
    <AuthFrame kicker="FlowForge" title="Sign in" description="Build, run, and monitor intelligent workflows.">
      <AuthForm mode="login" />
      {publicSignupEnabled() ? (
        <p className="mt-6 text-sm text-muted">
          New here?{" "}
          <Link className="text-text underline-offset-4 hover:underline" href="/signup">
            Create a workspace
          </Link>
        </p>
      ) : null}
      {demoEmail ? (
        <p className="mt-8 border border-border bg-surface/70 px-4 py-3 text-xs text-muted">
          Demo account: <span className="font-mono text-text">{demoEmail}</span>
          <br />
          Use the demo password provided by the operator. It is not stored in the application UI.
        </p>
      ) : null}
    </AuthFrame>
  );
}
