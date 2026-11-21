import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/session";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(user.onboardedAt ? "/app" : "/onboarding");
  return (
    <div className="animate-ink-in w-full max-w-sm">
      <h1 className="font-display text-4xl font-extrabold tracking-[-0.035em] text-ink">Welcome back</h1>
      <p className="mt-2 mb-7 text-ink-2">Sign in to pick up your conversations where you left them.</p>
      <SignIn path="/login" signUpUrl="/signup" fallbackRedirectUrl="/app" />
      <p className="mt-6 border-t border-line pt-6 text-sm text-ink-2">
        New to LinguaChat?{" "}
        <Link href="/signup" className="font-semibold text-accent-ink underline underline-offset-2">
          Create an account
        </Link>
      </p>
    </div>
  );
}
