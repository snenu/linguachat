import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/session";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Create account" };
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const user = await getSessionUser();
  if (user) redirect(user.onboardedAt ? "/app" : "/onboarding");
  return <SignupForm />;
}
