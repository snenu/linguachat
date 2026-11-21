import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="paper-grid flex min-h-screen flex-col bg-paper">
      <header className="px-4 py-5 sm:px-8">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-24">
        <div className="animate-ink-in w-full max-w-lg text-center">
          <div className="mx-auto flex max-w-sm flex-col gap-2.5 text-left" aria-hidden="true">
            <div className="max-w-[80%] self-start rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-2.5 text-ink shadow-sm">
              Where does this link go?
            </div>
            <div className="max-w-[85%] self-end rounded-xl border border-accent-line bg-surface px-4 py-2.5 shadow-sm">
              <p className="text-ink">
                This page <span className="strike">exists</span> <span className="corrected">doesn&apos;t exist</span>.
              </p>
            </div>
          </div>
          <h1 className="mt-10 font-display text-4xl font-extrabold tracking-[-0.035em] text-ink">Page not found</h1>
          <p className="mt-3 text-ink-2">The link may be old or mistyped. Head back and pick up the conversation.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/app">Go to your home</ButtonLink>
            <ButtonLink href="/" variant="secondary">
              Visit the homepage
            </ButtonLink>
          </div>
        </div>
      </main>
    </div>
  );
}
