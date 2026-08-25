import { redirect } from "next/navigation";
import { getContext } from "@/server/context";

export default async function HomePage() {
  const ctx = await getContext();
  if (!ctx) redirect("/login");
  if (!ctx.user.onboardedAt) redirect("/onboarding");
  redirect("/dashboard");
}
