import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { ensureMigrated } from "@/db/client";
import { users } from "@/db/schema";
import { requireContext } from "@/server/context";
import { createWorkflow } from "@/server/services/workflows";
import { Button } from "@/components/ui/button";

export default async function OnboardingPage() {
  const ctx = await requireContext();

  async function start(formData: FormData) {
    "use server";
    const session = await requireContext();
    const db = await ensureMigrated();
    await db.update(users).set({ onboardedAt: new Date() }).where(eq(users.id, session.user.id));
    const choice = String(formData.get("choice"));
    if (choice === "blank") {
      const id = await createWorkflow({
        orgId: session.org.id,
        userId: session.user.id,
        name: "First workflow",
      });
      redirect(`/workflows/${id}`);
    }
    if (choice === "template") {
      const id = await createWorkflow({
        orgId: session.org.id,
        userId: session.user.id,
        name: "",
        templateSlug: "lead-qualification",
      });
      redirect(`/workflows/${id}`);
    }
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
      <p className="text-xs uppercase tracking-[0.18em] text-accent">Getting started</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Six minutes to a working automation</h1>
      <ol className="mt-6 grid gap-2 text-sm text-muted">
        <li>1. Create a workspace — done ({ctx.org.name})</li>
        <li>2. Create a first workflow</li>
        <li>3. Choose a template or a blank canvas</li>
        <li>4. Connect a couple of nodes</li>
        <li>5. Test a run</li>
        <li>6. Publish the version executions will use</li>
      </ol>
      <form action={start} className="mt-8 grid gap-2">
        <Button name="choice" value="template">
          Start from lead qualification
        </Button>
        <Button name="choice" value="blank" variant="secondary">
          Start blank
        </Button>
        <Button name="choice" value="skip" variant="ghost">
          Skip and open the dashboard
        </Button>
      </form>
    </main>
  );
}
