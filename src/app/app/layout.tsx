import { redirect } from "next/navigation";
import { AppProviders } from "@/components/app/providers";
import { AppShell } from "@/components/app/shell";
import { publicProfile } from "@/lib/server/domain";
import { getSessionUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.onboardedAt) redirect("/onboarding");
  const me = {
    ...publicProfile(user),
    email: user.email,
    dailyTarget: user.dailyTarget,
    timezone: user.timezone,
    autoCorrect: user.autoCorrect,
    onboarded: true,
  };
  return (
    <AppProviders me={me}>
      <AppShell>{children}</AppShell>
    </AppProviders>
  );
}
