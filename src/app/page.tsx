import { redirect } from "next/navigation";
import { BookOpenCheck, Languages, MessageSquareText, Mic, Sparkles, UsersRound } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { LANGUAGES } from "@/lib/languages";
import { getSessionUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

const coach = [
  { icon: Sparkles, title: "Check before you send", body: "See a corrected version of your sentence with a one-line reason, then decide what to send." },
  { icon: MessageSquareText, title: "Corrections that stay quiet", body: "After you send, a small note appears under the message. Open it when you want the lesson." },
  { icon: Languages, title: "Tap to understand", body: "Translate any message into your language, or tap a word for its meaning, an example and its sound." },
  { icon: Mic, title: "Speak, then read it back", body: "Send voice messages. The coach writes out what you said and fixes what needs fixing." },
  { icon: UsersRound, title: "Partners correct you too", body: "Your partner can send a correction card: what you wrote, what a native would say, and why." },
  { icon: BookOpenCheck, title: "Remember what you learn", body: "Saved words become flashcards on a spaced schedule. Your mistakes are grouped so patterns show." },
];

export default async function Landing() {
  const user = await getSessionUser();
  if (user) redirect(user.onboardedAt ? "/app" : "/onboarding");

  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <ButtonLink href="/login" variant="ghost" size="sm">
            Sign in
          </ButtonLink>
          <ButtonLink href="/signup" size="sm">
            Create account
          </ButtonLink>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
          <div>
            <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink sm:text-[3.6rem] sm:leading-[1.05]">
              Every conversation is a lesson.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-2">
              Chat with native speakers who are learning your language. A kind AI coach sits beside you, corrects your
              sentences, explains why, and turns new words into flashcards.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/signup" size="lg">
                Find a language partner
              </ButtonLink>
              <ButtonLink href="/login" size="lg" variant="secondary">
                I have an account
              </ButtonLink>
            </div>
            <p className="mt-5 text-sm text-ink-3">Free. For learners aged 16 and over.</p>
          </div>

          {/* The product's core moment: a sentence, the correction, and the reason. */}
          <figure aria-label="Example of a correction in a chat" className="rounded-lg border border-line-strong bg-surface p-5 sm:p-7">
            <div className="flex flex-col gap-4">
              <div className="max-w-[85%] self-start rounded-lg rounded-bl-sm border border-line bg-paper px-4 py-3">
                <p className="text-xs font-semibold text-ink-2">Priya · native Hindi speaker</p>
                <p className="mt-1">How was your weekend?</p>
              </div>
              <div className="max-w-[88%] self-end">
                <div className="rounded-lg rounded-br-sm bg-ink px-4 py-3 text-surface">
                  <p>Yesterday I go to the market and buyed mangoes.</p>
                </div>
                <div className="mt-2 rounded-md border border-accent/30 bg-accent-wash px-4 py-3">
                  <p className="text-[0.95rem] leading-relaxed">
                    <span className="strike">I go</span> <span className="corrected">I went</span> to the market and{" "}
                    <span className="strike">buyed</span> <span className="corrected">bought</span> mangoes.
                  </p>
                  <p className="mt-1.5 text-sm text-ink-2">Past tense: go becomes went, buy becomes bought.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end text-sm text-ink-2">
                <span className="marker font-semibold text-ink">bought</span> saved to your flashcards
              </div>
            </div>
          </figure>
        </section>

        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="font-serif text-2xl font-semibold text-ink sm:text-3xl">How it works</h2>
            <ol className="mt-8 grid gap-8 md:grid-cols-3">
              {[
                ["Tell us your languages", "Pick what you speak, what you're learning and your level. A short self-check helps you choose."],
                ["Match with a tandem partner", "We rank people who speak your target language and want to learn yours, by shared interests and level."],
                ["Chat, get coached, review", "Talk in real time. Corrections, translations and flashcards come from every conversation."],
              ].map(([title, body], i) => (
                <li key={title} className="flex gap-4">
                  <span className="font-serif text-3xl font-semibold text-accent">{i + 1}</span>
                  <div>
                    <h3 className="font-semibold text-ink">{title}</h3>
                    <p className="mt-1 text-ink-2">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-ink sm:text-3xl">What the coach does</h2>
          <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {coach.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-3.5">
                <Icon size={22} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                <div>
                  <h3 className="font-semibold text-ink">{title}</h3>
                  <p className="mt-1 text-ink-2">{body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 rounded-lg border border-line bg-surface p-6">
            <h3 className="font-semibold text-ink">Practise any time with the AI tutor</h3>
            <p className="mt-1 max-w-2xl text-ink-2">
              No partner online? Role-play ordering at a café, a job interview or a doctor&apos;s visit with an AI tutor that
              adapts to your level and suggests what to say when you&apos;re stuck.
            </p>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="font-serif text-xl font-semibold text-ink">Twelve languages, every direction</h2>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3 font-serif text-xl text-ink" lang="mul">
              {LANGUAGES.map((l) => (
                <li key={l.code} lang={l.code} dir={l.rtl ? "rtl" : undefined} title={l.name}>
                  {l.native}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-ink-3 sm:px-6">
          <span>LinguaChat. Real-time chat by Nexconn, coaching by Gemini.</span>
          <span>For learners 16+</span>
        </div>
      </footer>
    </div>
  );
}
