import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { getSessionUser } from "@/lib/server/session";
import { OnboardingFlow } from "./onboarding-flow";

export const metadata = { title: "Set up your profile" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.onboardedAt) redirect("/app");
  return (
    <div className="paper-grid min-h-screen bg-paper">
      <header className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
        <Logo href="/onboarding" />
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 pb-20 sm:px-6">
        <div className="rounded-xl border border-line bg-surface p-5 shadow-md sm:p-8">
          <OnboardingFlow name={user.displayName} />
        </div>
      </main>
    </div>
  );
}
