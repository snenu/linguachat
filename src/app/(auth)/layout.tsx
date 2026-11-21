import { CheckCheck, PenLine } from "lucide-react";
import { Logo } from "@/components/ui/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-paper lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col">
        <header className="px-4 py-5 sm:px-8">
          <Logo />
        </header>
        <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:items-center sm:pt-0">{children}</main>
      </div>
      <AuthAside />
    </div>
  );
}

/** The product's core moment, shown beside the form on wide screens. */
function AuthAside() {
  return (
    <aside aria-hidden="true" className="relative hidden overflow-hidden bg-night lg:flex lg:flex-col lg:justify-center lg:px-14 xl:px-20">
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:22px_22px]" />
      <div className="relative max-w-md">
        <p className="font-display text-[2.6rem] leading-[1.02] font-extrabold tracking-[-0.04em] text-white">Every conversation is a lesson.</p>
        <p className="mt-4 text-lg text-white/65">Native speakers to talk to, and a coach who quietly fixes the little things.</p>

        <div className="mt-10 flex flex-col gap-3">
          <div className="max-w-[80%] self-start rounded-2xl rounded-bl-md bg-white/10 px-4 py-2.5 text-white" lang="fr">
            Tu as fait quoi ce week-end ?
          </div>
          <div className="flex max-w-[88%] flex-col items-end self-end">
            <div className="rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-white" lang="fr">
              Je suis allé au boulangerie avec ma sœur.
            </div>
            <span className="mt-1 flex items-center gap-1 text-xs text-white/50">
              <CheckCheck size={12} /> Read
            </span>
          </div>
          <div className="max-w-[92%] self-end rounded-xl bg-white px-4 py-3 shadow-lg">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-accent-ink">
              <PenLine size={13} /> Coach note: grammar
            </p>
            <p className="mt-1.5 text-ink" lang="fr">
              Je suis allé <span className="strike">au</span> <span className="corrected">à la</span> boulangerie avec ma sœur.
            </p>
            <p className="mt-1 text-sm text-ink-2">Boulangerie is feminine, so it takes à la, not au.</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
