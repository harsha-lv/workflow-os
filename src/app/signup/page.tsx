import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getContext } from "@/server/context";
import { publicSignupEnabled } from "@/server/config";
import { AuthFrame } from "@/components/layout/auth-frame";

export default async function SignupPage() {
  const ctx = await getContext();
  if (ctx) redirect("/dashboard");
  if (!publicSignupEnabled()) {
    redirect("/login");
  }
  return (
    <AuthFrame
      kicker="FlowForge"
      title="Create a workspace"
      description="A workspace holds projects, workflows, secrets, and the audit log."
    >
      <AuthForm mode="signup" />
      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link className="text-text underline-offset-4 hover:underline" href="/login">
          Sign in
        </Link>
      </p>
    </AuthFrame>
  );
}
