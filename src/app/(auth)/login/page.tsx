import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(user.onboardedAt ? "/app" : "/onboarding");
  return <LoginForm />;
}
