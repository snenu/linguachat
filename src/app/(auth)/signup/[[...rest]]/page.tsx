import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/session";

export const metadata = { title: "Create account" };
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const user = await getSessionUser();
  if (user) redirect(user.onboardedAt ? "/app" : "/onboarding");
  return (
    <div className="animate-ink-in w-full max-w-sm">
      <h1 className="font-display text-4xl font-extrabold tracking-[-0.035em] text-ink">Create your account</h1>
      <p className="mt-2 mb-7 text-ink-2">Two minutes to set up, then you can start chatting with native speakers. For learners 16 and over.</p>
      <SignUp path="/signup" signInUrl="/login" fallbackRedirectUrl="/onboarding" />
      <p className="mt-6 border-t border-line pt-6 text-sm text-ink-2">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-accent-ink underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </div>
  );
}
