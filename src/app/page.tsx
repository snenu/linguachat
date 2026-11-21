import {
  ArrowLeftRight,
  Briefcase,
  Check,
  CheckCheck,
  Coffee,
  Flame,
  Languages,
  Lightbulb,
  MessageCircle,
  Mic,
  PenLine,
  Plane,
  Play,
  ShieldCheck,
  Sparkles,
  SpellCheck,
  Stethoscope,
  UsersRound,
  Volume2,
} from "lucide-react";
import { redirect } from "next/navigation";
import { FlipCard } from "@/components/landing/flip-card";
import { HeroDemo } from "@/components/landing/hero-demo";
import { Reveal } from "@/components/landing/reveal";
import { SiteHeader } from "@/components/landing/site-header";
import { TutorDemo } from "@/components/landing/tutor-demo";
import { ButtonLink } from "@/components/ui/button";
import { Logo, LogoMark } from "@/components/ui/logo";
import { BUBBLE_A, BUBBLE_B } from "@/lib/brand";
import { LANGUAGES } from "@/lib/languages";
import { getSessionUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

const REPO = "https://github.com/snenu/linguachat";

const GREETINGS = [
  ["Hello", "English", "en"],
  ["नमस्ते", "Hindi", "hi"],
  ["Hola", "Spanish", "es"],
  ["Bonjour", "French", "fr"],
  ["Hallo", "German", "de"],
  ["Olá", "Portuguese", "pt"],
  ["Ciao", "Italian", "it"],
  ["Привет", "Russian", "ru"],
  ["こんにちは", "Japanese", "ja"],
  ["안녕하세요", "Korean", "ko"],
  ["你好", "Mandarin", "zh"],
  ["مرحبا", "Arabic", "ar"],
] as const;

const NEXCONN = [
  { name: "Direct channels", body: "Every tandem chat and your AI tutor conversation." },
  { name: "Group channels", body: "Practice rooms for each language, level and topic." },
  { name: "Message metadata", body: "Coach notes and voice transcripts attach to the original message and update live for both people." },
  { name: "Streaming messages", body: "Tutor replies arrive word by word as they are written." },
  { name: "Custom message types", body: "Correction cards, vocabulary cards, tutor tips and daily room prompts." },
  { name: "Online presence", body: "Who is online now, in partner lists, chats and rooms." },
  { name: "Receipts, typing and unread", body: "A quiet “Read”, “Sam is typing”, unread badges and older messages as you scroll." },
  { name: "HD voice messages", body: "Voice notes upload through the SDK, then the coach transcribes them." },
  { name: "Status messages", body: "Chat requests and accepts arrive instantly without filling your history." },
  { name: "User blocklist", body: "Blocking someone stops their messages at the network, not just in the app." },
  { name: "Message reactions", body: "React to any message with an emoji; your partner sees it appear instantly." },
  { name: "Server-sent bot messages", body: "The tutor and room host post through the Platform Chat API." },
];

const FAQ = [
  ["Is LinguaChat free?", "Yes. Create an account and start chatting. There are no paid plans or message limits for normal use."],
  ["Who can join?", "Learners aged 16 and over. LinguaChat connects you with people you don't know, so you confirm your age when you sign up."],
  [
    "How does the AI coach work?",
    "When you write in the language you're learning, the coach checks the sentence and attaches a short note: the corrected version and one line on why, explained in your native language. You can also check a sentence before you send it.",
  ],
  [
    "Will my partner see my corrections?",
    "Yes. Coach notes are attached to the message, so you both see them. That's the point of a tandem: your partner can send you a correction card too, and you can correct theirs.",
  ],
  [
    "What if nobody is online?",
    "Practise with the AI tutor in a role-play scene, or answer today's prompt in a practice room. Messages you send to a partner wait for them.",
  ],
  ["Can I block or report someone?", "Yes, from their profile or the chat menu. Blocking stops their messages immediately, and reports are kept for review."],
];

export default async function Landing() {
  const user = await getSessionUser();
  if (user) redirect(user.onboardedAt ? "/app" : "/onboarding");

  return (
    <div className="min-h-screen overflow-x-clip bg-paper">
      <SiteHeader />

      <main>
        {/* Hero ----------------------------------------------------------------------------- */}
        <section className="relative">
          <div className="paper-grid pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pt-10 pb-20 sm:px-6 lg:grid-cols-[1.08fr_1fr] lg:gap-12 lg:pt-16 lg:pb-28">
            <div className="animate-ink-in">
              <h1 className="font-display text-[clamp(2.7rem,6.4vw,4.9rem)] leading-[0.97] font-extrabold tracking-[-0.045em] text-ink [font-stretch:92%]">
                Learn a language from the people who speak it.
              </h1>
              <p className="mt-6 max-w-[34rem] text-lg text-ink-2">
                Chat in real time with native speakers who are learning your language. A kind AI coach sits beside every
                conversation: it corrects your sentences, explains why in your own language, and turns new words into flashcards.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/signup" size="lg">
                  Find a language partner
                </ButtonLink>
                <ButtonLink href="#how" size="lg" variant="secondary" icon={<Play size={16} fill="currentColor" />}>
                  See how it works
                </ButtonLink>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-2">
                {["Free to use", "12 languages, any pair", "For learners 16+"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Check size={15} className="text-mint" strokeWidth={3} aria-hidden="true" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="animate-pop-in [animation-delay:150ms] lg:pl-4">
              <HeroDemo />
            </div>
          </div>
        </section>

        {/* Greetings -------------------------------------------------------------------------- */}
        <section aria-label="Languages on LinguaChat" className="marquee overflow-hidden bg-night py-7 text-white">
          <div className="marquee-track flex w-max">
            {[0, 1].map((copy) => (
              <ul key={copy} aria-hidden={copy === 1 || undefined} className="flex shrink-0 items-baseline">
                {GREETINGS.map(([word, name, lang]) => (
                  <li key={name} className="flex items-baseline gap-3 px-7">
                    <span lang={lang} dir={lang === "ar" ? "rtl" : undefined} className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                      {word}
                    </span>
                    <span className="text-sm text-white/55">{name}</span>
                    <LogoMark size={16} className="ml-7 opacity-60" />
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </section>

        {/* How it works ---------------------------------------------------------------------- */}
        <section id="how" className="scroll-mt-20">
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
            <Reveal>
              <h2 className="font-display text-3xl font-extrabold tracking-[-0.035em] text-ink sm:text-[2.75rem] sm:leading-[1.05]">
                You teach yours. They teach theirs.
              </h2>
              <p className="mt-4 max-w-lg text-lg text-ink-2">
                A tandem pairs you with someone who speaks the language you want and wants the language you speak. You both
                get a native speaker, and the coach keeps the lesson going.
              </p>
              <ol className="mt-10 flex flex-col gap-7">
                {[
                  ["Tell us your languages", "What you speak, what you're learning and your level. A short self-check helps you pick it."],
                  ["Meet your match", "Partners are ranked by tandem fit, shared interests, level and who is online right now."],
                  ["Chat, get coached, review", "Talk in real time. Corrections, translations and flashcards come out of every conversation."],
                ].map(([title, body], i) => (
                  <li key={title} className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-accent font-display text-lg font-bold text-accent">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-ink">{title}</h3>
                      <p className="mt-1 text-ink-2">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Reveal>

            <Reveal delay={120} className="relative">
              <MatchVisual />
            </Reveal>
          </div>
        </section>

        {/* Coach ----------------------------------------------------------------------------- */}
        <section id="coach" className="scroll-mt-20 border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <Reveal className="max-w-2xl">
              <h2 className="font-display text-3xl font-extrabold tracking-[-0.035em] text-ink sm:text-[2.75rem] sm:leading-[1.05]">
                A coach in every conversation
              </h2>
              <p className="mt-4 text-lg text-ink-2">
                It never interrupts. Corrections wait quietly under your message until you want the lesson, and everything
                you learn ends up in your notebook.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-4 lg:grid-cols-6">
              <Panel className="lg:col-span-3" delay={0} icon={<SpellCheck size={18} />} title="Check before you send" body="See the corrected sentence and why, then choose what to send.">
                <div className="rounded-lg border border-line bg-paper p-3.5">
                  <p className="rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink">I am agree with you.</p>
                  <div className="mt-2.5 rounded-md border border-accent-line bg-accent-wash px-3 py-2.5">
                    <p className="text-sm">
                      <span className="strike">I am agree</span> <span className="corrected">I agree</span> with you.
                    </p>
                    <p className="mt-1 text-xs text-ink-2">Agree is already a verb, so it doesn&apos;t need am.</p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <span className="rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-white">Send corrected</span>
                      <span className="rounded-md border border-line-strong bg-surface px-2.5 py-1 text-xs font-semibold text-ink">Edit</span>
                      <span className="rounded-md px-2.5 py-1 text-xs font-semibold text-ink-2">Send mine</span>
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel className="lg:col-span-3" delay={80} icon={<Languages size={18} />} title="Tap any word" body="Meaning, reading, an example and its sound. Save it with one tap.">
                <div className="rounded-lg border border-line bg-paper p-3.5" lang="es">
                  <p className="text-sm text-ink">
                    Estoy muy <span className="rounded bg-marker-wash px-1 font-semibold underline decoration-marker decoration-2 underline-offset-4">cansado</span> después del trabajo.
                  </p>
                  <div className="mt-2.5 rounded-md border border-line bg-surface px-3 py-2.5 shadow-sm">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-pen text-xl font-semibold text-ink">cansado</p>
                      <span className="text-xs text-ink-3" lang="en">adjective</span>
                    </div>
                    <p className="text-sm text-ink" lang="en">
                      tired
                    </p>
                    <p className="mt-1 text-xs text-ink-2 italic">¿Estás cansada? Are you tired?</p>
                    <div className="mt-2 flex gap-1.5" lang="en">
                      <span className="flex items-center gap-1 rounded-md border border-line-strong px-2 py-0.5 text-xs font-semibold text-ink">
                        <Volume2 size={12} /> Listen
                      </span>
                      <span className="rounded-md bg-ink px-2 py-0.5 text-xs font-semibold text-white">Save word</span>
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel className="lg:col-span-2" delay={0} icon={<Mic size={18} />} title="Speak, then read it back" body="Voice messages get a transcript, and your own get a correction.">
                <div className="rounded-lg border border-line bg-paper p-3.5">
                  <div className="flex items-center gap-2.5 rounded-full bg-accent py-1.5 pr-3 pl-1.5 text-white">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                      <Play size={12} fill="currentColor" />
                    </span>
                    <span className="flex h-6 flex-1 items-center gap-[3px]">
                      {[5, 11, 7, 15, 9, 18, 12, 6, 14, 10, 16, 8, 12, 6, 9, 4].map((h, i) => (
                        <span key={i} className="w-[3px] rounded-full bg-white/80" style={{ height: h + 2 }} />
                      ))}
                    </span>
                    <span className="text-xs tabular-nums">0:07</span>
                  </div>
                  <p className="mt-2.5 text-sm text-ink" lang="de">
                    „Ich habe gestern Fußball gespielt.”
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-mint">
                    <Check size={12} strokeWidth={3} /> Sounds right
                  </p>
                </div>
              </Panel>

              <Panel className="lg:col-span-2" delay={80} icon={<PenLine size={18} />} title="Partners correct you too" body="A correction card: what you wrote, what a native would say, and why.">
                <div className="rounded-lg border border-line bg-paper p-3.5">
                  <p className="text-xs font-semibold text-ink-2">Sam corrected your message</p>
                  <p className="mt-1.5 text-sm">
                    See you <span className="strike">in</span> <span className="corrected">on</span> the weekend!
                  </p>
                  <p className="mt-1 text-xs text-ink-2">In American English it&apos;s on the weekend.</p>
                  <span className="mt-2 inline-block rounded-full bg-marker-wash px-2 py-0.5 text-[0.7rem] font-semibold text-ink">word choice</span>
                </div>
              </Panel>

              <Panel className="lg:col-span-2" delay={160} icon={<ArrowLeftRight size={18} />} title="Translate any message" body="Into your language, when you'd rather check than guess.">
                <div className="rounded-lg border border-line bg-paper p-3.5">
                  <p className="rounded-2xl rounded-bl-md border border-line bg-surface px-3 py-2 text-sm text-ink" lang="pt">
                    Quer tomar um café amanhã?
                  </p>
                  <p className="mt-2 border-l-2 border-accent pl-2.5 text-sm text-ink-2">Do you want to get a coffee tomorrow?</p>
                </div>
              </Panel>
            </div>
          </div>
        </section>

        {/* Tutor + rooms --------------------------------------------------------------------- */}
        <section id="tutor" className="scroll-mt-20">
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
            <Reveal>
              <h2 className="font-display text-3xl font-extrabold tracking-[-0.035em] text-ink sm:text-[2.75rem] sm:leading-[1.05]">
                No partner online? Practise anyway.
              </h2>
              <p className="mt-4 max-w-lg text-lg text-ink-2">
                Your AI tutor plays a scene with you at your level, corrects you as you go, and suggests what to say when
                you&apos;re stuck.
              </p>
              <ul className="mt-8 flex flex-wrap gap-2">
                {[
                  [Coffee, "At a café"],
                  [Briefcase, "Job interview"],
                  [Plane, "Travel"],
                  [Stethoscope, "At the doctor"],
                  [MessageCircle, "Small talk"],
                  [Sparkles, "Your own scene"],
                ].map(([Icon, label]) => {
                  const I = Icon as typeof Coffee;
                  return (
                    <li key={label as string} className="flex items-center gap-2 rounded-full border border-line-strong bg-surface px-3.5 py-2 text-sm font-semibold text-ink shadow-sm">
                      <I size={15} className="text-accent" aria-hidden="true" /> {label as string}
                    </li>
                  );
                })}
              </ul>
            </Reveal>
            <Reveal delay={120}>
              <TutorDemo />
            </Reveal>
          </div>

          <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 sm:px-6 lg:grid-cols-2 lg:pb-28">
            <Reveal className="order-2 lg:order-1">
              <RoomsVisual />
            </Reveal>
            <Reveal delay={120} className="order-1 lg:order-2">
              <h2 className="font-display text-3xl font-extrabold tracking-[-0.035em] text-ink sm:text-[2.75rem] sm:leading-[1.05]">
                Rooms with a new question every day
              </h2>
              <p className="mt-4 max-w-lg text-lg text-ink-2">
                Group chats for each language, level and topic. Every morning the room host posts a fresh conversation prompt,
                and native speakers drop in to help.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Progress -------------------------------------------------------------------------- */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <Reveal className="max-w-2xl">
              <h2 className="font-display text-3xl font-extrabold tracking-[-0.035em] text-ink sm:text-[2.75rem] sm:leading-[1.05]">
                Remember what you learn
              </h2>
              <p className="mt-4 text-lg text-ink-2">
                Saved words come back as flashcards right before you&apos;d forget them. Your mistakes are grouped, so the
                patterns behind them become clear.
              </p>
            </Reveal>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              <Reveal delay={0} className="rounded-xl border border-line bg-paper p-5">
                <h3 className="font-bold text-ink">A streak you can keep</h3>
                <p className="mt-1 text-sm text-ink-2">Meet your daily goal in chats, the tutor or reviews.</p>
                <div className="mt-5 grid grid-cols-7 gap-1.5 text-center">
                  {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-full ${i < 5 ? "bg-red text-white" : i === 5 ? "border-2 border-dashed border-red/50 text-red" : "bg-wash text-ink-3"}`}
                      >
                        <Flame size={16} fill={i < 5 ? "currentColor" : "none"} aria-hidden="true" />
                      </span>
                      <span className="text-xs text-ink-3">{d}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 font-display text-2xl font-bold text-ink">5-day streak</p>
              </Reveal>
              <Reveal delay={90} className="rounded-xl border border-line bg-paper p-5">
                <h3 className="font-bold text-ink">Flashcards on a schedule</h3>
                <p className="mt-1 mb-5 text-sm text-ink-2">Spaced repetition (SM-2) decides when each word returns.</p>
                <FlipCard />
              </Reveal>
              <Reveal delay={180} className="rounded-xl border border-line bg-paper p-5">
                <h3 className="font-bold text-ink">Patterns in your mistakes</h3>
                <p className="mt-1 text-sm text-ink-2">The coach notices what keeps coming back.</p>
                <div className="mt-5 flex flex-col gap-2.5">
                  {[
                    ["Grammar", 12, "bg-red"],
                    ["Vocabulary", 7, "bg-accent"],
                    ["Spelling", 4, "bg-marker"],
                    ["Word order", 2, "bg-mint"],
                  ].map(([label, n, color]) => (
                    <div key={label as string} className="flex items-center gap-3 text-sm">
                      <span className="w-24 shrink-0 text-ink-2">{label}</span>
                      <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-wash">
                        <span className={`block h-full rounded-full ${color}`} style={{ width: `${((n as number) / 12) * 100}%` }} />
                      </span>
                      <span className="w-5 text-right font-semibold text-ink tabular-nums">{n}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 rounded-md bg-marker-wash px-3 py-2 text-sm text-ink">
                  You often use <span className="font-semibold">ser</span> where Spanish needs <span className="font-semibold">estar</span>.
                </p>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Nexconn --------------------------------------------------------------------------- */}
        <section id="nexconn" className="scroll-mt-16 bg-night text-white">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <Reveal className="max-w-2xl">
              <h2 className="font-display text-3xl font-extrabold tracking-[-0.035em] sm:text-[2.75rem] sm:leading-[1.05]">Real time, built on Nexconn</h2>
              <p className="mt-4 text-lg text-white/70">
                Every message, receipt, typing dot and coach note travels over Nexconn&apos;s chat network in Singapore. The
                browser talks to Nexconn through the Web Chat SDK; our server acts through the Platform Chat API.
              </p>
            </Reveal>

            <Reveal delay={100} className="mt-12">
              <FlowDiagram />
            </Reveal>

            <ul className="mt-14 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
              {NEXCONN.map((f, i) => (
                <Reveal as="li" key={f.name} delay={(i % 3) * 70} className="border-t border-white/15 pt-4">
                  <h3 className="font-bold">{f.name}</h3>
                  <p className="mt-1 text-sm text-white/65">{f.body}</p>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* Languages ------------------------------------------------------------------------- */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-extrabold tracking-[-0.035em] text-ink sm:text-[2.75rem] sm:leading-[1.05]">
                Twelve languages, any pair
              </h2>
              <p className="mt-3 max-w-lg text-lg text-ink-2">Learn Japanese from Hindi, or Arabic from Portuguese. Every direction works.</p>
            </div>
          </Reveal>
          <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" lang="mul">
            {LANGUAGES.map((l, i) => (
              <Reveal
                as="li"
                key={l.code}
                delay={(i % 4) * 60}
                className="group flex flex-col gap-0.5 rounded-lg border border-line bg-surface px-4 py-3.5 transition-[border-color,box-shadow] hover:border-accent-line hover:shadow-md sm:flex-row sm:items-baseline sm:justify-between sm:gap-2"
              >
                <span lang={l.code} dir={l.rtl ? "rtl" : undefined} className="font-display text-xl font-bold text-ink">
                  {l.native}
                </span>
                <span className="text-xs text-ink-3">{l.name}</span>
              </Reveal>
            ))}
          </ul>
        </section>

        {/* FAQ ------------------------------------------------------------------------------- */}
        <section id="faq" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.6fr] lg:py-24">
            <Reveal>
              <h2 className="font-display text-3xl font-extrabold tracking-[-0.035em] text-ink sm:text-[2.75rem] sm:leading-[1.05]">Questions</h2>
              <p className="mt-3 text-ink-2">
                Something else?{" "}
                <a href={`${REPO}/issues`} className="font-semibold text-accent-ink underline underline-offset-2">
                  Open an issue on GitHub
                </a>
                .
              </p>
            </Reveal>
            <Reveal delay={100} className="divide-y divide-line border-y border-line">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group py-1">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-bold text-ink [&::-webkit-details-marker]:hidden">
                    {q}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink-2 transition-transform duration-300 group-open:rotate-45">
                      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                        <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </span>
                  </summary>
                  <p className="animate-ink-in max-w-2xl pb-5 text-ink-2">{a}</p>
                </details>
              ))}
            </Reveal>
          </div>
        </section>

        {/* Closing invitation ---------------------------------------------------------------- */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <Reveal className="airmail relative rounded-xl shadow-md">
            <div className="flex flex-col items-start gap-8 px-6 py-12 sm:px-12 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <h2 className="font-display text-3xl font-extrabold tracking-[-0.035em] text-ink sm:text-4xl">Your first conversation is one message away.</h2>
                <p className="mt-3 text-lg text-ink-2">Set up in two minutes. Your partner might already be online.</p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <ButtonLink href="/signup" size="lg">
                    Create your free account
                  </ButtonLink>
                  <ButtonLink href="/login" size="lg" variant="secondary">
                    Sign in
                  </ButtonLink>
                </div>
              </div>
              <Stamp />
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-ink-2">Learn a language by chatting with native speakers, with a kind AI coach beside you.</p>
          </div>
          <FooterCol
            title="Product"
            links={[
              ["How it works", "#how"],
              ["AI coach", "#coach"],
              ["Tutor and rooms", "#tutor"],
              ["FAQ", "#faq"],
            ]}
          />
          <FooterCol
            title="Account"
            links={[
              ["Create account", "/signup"],
              ["Sign in", "/login"],
            ]}
          />
          <FooterCol
            title="Project"
            links={[
              ["Source on GitHub", REPO],
              ["Nexconn docs", "https://docs.nexconn.ai"],
            ]}
          />
        </div>
        <div className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-sm text-ink-3 sm:px-6">
            <span>Built for the Nexconn Build Challenge 2026. Real-time chat by Nexconn, coaching by Gemini.</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={15} aria-hidden="true" /> For learners 16+
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Panel({
  icon,
  title,
  body,
  children,
  className = "",
  delay = 0,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <Reveal delay={delay} className={`flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 shadow-sm transition-shadow hover:shadow-md ${className}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent-wash text-accent" aria-hidden="true">
          {icon}
        </span>
        <div>
          <h3 className="font-bold text-ink">{title}</h3>
          <p className="mt-0.5 text-sm text-ink-2">{body}</p>
        </div>
      </div>
      <div aria-hidden="true" className="mt-auto">
        {children}
      </div>
    </Reveal>
  );
}

function MatchVisual() {
  return (
    <div className="relative mx-auto max-w-md" role="img" aria-label="A tandem match: you speak Hindi and learn English; Sam speaks English and learns Hindi. 92% match.">
      <div aria-hidden="true" className="flex flex-col gap-3">
        <PersonCard name="You" initials="AS" bg="#FDEEDB" fg="#8A4B06" speaks="Hindi" learns="English" level="B1" />
        <div className="relative flex items-center justify-center py-1">
          <span className="absolute inset-x-1/2 h-full w-px -translate-x-1/2 border-l-2 border-dashed border-accent/40" />
          <span className="relative flex items-center gap-2 rounded-full bg-accent px-4 py-2 font-display text-lg font-bold text-white shadow-md">
            <ArrowLeftRight size={18} /> 92% match
          </span>
        </div>
        <PersonCard name="Sam" initials="S" bg="#E8ECFB" fg="#1B2F9E" speaks="English" learns="Hindi" level="A2" online />
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {["Perfect tandem", "Both into cooking and travel", "Online now"].map((r) => (
            <span key={r} className="flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1 text-sm text-ink shadow-sm">
              <Check size={13} className="text-mint" strokeWidth={3} /> {r}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function PersonCard({
  name,
  initials,
  bg,
  fg,
  speaks,
  learns,
  level,
  online,
}: {
  name: string;
  initials: string;
  bg: string;
  fg: string;
  speaks: string;
  learns: string;
  level: string;
  online?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-line bg-surface p-4 shadow-md">
      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-bold" style={{ background: bg, color: fg }}>
        {initials}
        {online && <span className="live-ring absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface bg-mint" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-ink">{name}</p>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-ink-2">
          speaks <span className="rounded-full border border-line px-2 py-px text-xs font-semibold text-ink">{speaks}</span> learning{" "}
          <span className="rounded-full border border-line px-2 py-px text-xs font-semibold text-ink">
            {learns} <span className="text-accent-ink">{level}</span>
          </span>
        </p>
      </div>
    </div>
  );
}

function RoomsVisual() {
  const rooms = [
    ["Spanish B1–B2: Travel", 14, 5],
    ["Spanish B1–B2: Everyday life", 22, 8],
    ["Spanish B1–B2: Films, music and culture", 9, 2],
  ] as const;
  return (
    <div className="flex flex-col gap-3" role="img" aria-label="Practice rooms list with today's prompt">
      <div aria-hidden="true" className="flex flex-col gap-3">
        <div className="rounded-xl border-2 border-ink bg-surface p-5 shadow-md">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink-2">
            <Lightbulb size={15} className="text-marker" fill="var(--marker)" /> Today&apos;s prompt
          </p>
          <p className="mt-2 font-pen text-xl text-ink" lang="es">
            ¿Cuál es la mejor comida que has probado en un viaje?
          </p>
          <p className="mt-1.5 text-sm text-ink-2" lang="es">
            Útil: <span className="font-semibold">probar, el sabor, me encantó</span>
          </p>
        </div>
        {rooms.map(([name, members, online]) => (
          <div key={name} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-sm">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-wash text-accent">
              <UsersRound size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink">{name}</p>
              <p className="text-xs text-ink-3">{members} members</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-mint-wash px-2.5 py-1 text-xs font-semibold text-mint">
              <span className="h-1.5 w-1.5 rounded-full bg-mint" /> {online} online
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Browser ⇄ Nexconn ⇄ our server → Gemini, with messages travelling along the wires. */
function FlowDiagram() {
  const nodes = [
    { title: "Your browser", sub: "Nexconn Web Chat SDK", detail: "Send, receive, presence, receipts, typing, voice" },
    { title: "Nexconn (Singapore)", sub: "Chat network", detail: "Direct and group channels, metadata, streams" },
    { title: "LinguaChat server", sub: "Platform Chat API", detail: "Tokens, bots, groups, coach notes, blocklist" },
    { title: "AI coach", sub: "Gemini", detail: "Corrections, translation, words, voice, tutor" },
  ];
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-stretch">
      {nodes.map((n, i) => (
        <div key={n.title} className="contents">
          <div className={`rounded-xl border p-4 ${i === 1 ? "border-marker/70 bg-white/[0.07]" : "border-white/15 bg-white/[0.03]"}`}>
            <p className="text-xs font-semibold text-white/55">{n.sub}</p>
            <p className="mt-1 font-display text-lg font-bold">{n.title}</p>
            <p className="mt-1.5 text-sm text-white/65">{n.detail}</p>
          </div>
          {i < nodes.length - 1 && (
            <div aria-hidden="true" className="relative flex h-8 items-center justify-center lg:h-auto lg:w-14">
              <span className="absolute h-full w-px bg-white/20 lg:h-px lg:w-full" />
              <span className="flow-dot absolute left-[calc(50%-4px)] h-2 w-2 rounded-full bg-marker lg:top-[calc(50%-4px)]" style={{ animationDelay: `${i * 0.4}s` }} />
              <span className="flow-dot flow-dot-back absolute left-[calc(50%-4px)] h-2 w-2 rounded-full bg-[#8FA2FF] lg:top-[calc(50%-4px)]" style={{ animationDelay: `${i * 0.4 + 1}s` }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-ink">{title}</h3>
      <ul className="mt-3 flex flex-col gap-2 text-sm">
        {links.map(([label, href]) => (
          <li key={label}>
            <a
              href={href}
              className="inline-flex items-center gap-1.5 text-ink-2 transition-colors hover:text-accent-ink"
              {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
            >
              {label === "Source on GitHub" && <GitHubMark />}
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A postage stamp with perforated edges, carrying the LinguaChat mark. */
function Stamp() {
  const W = 132;
  const H = 156;
  const step = 12;
  const holes: [number, number][] = [];
  for (let x = step / 2; x < W; x += step) holes.push([x, 0], [x, H]);
  for (let y = step / 2; y < H; y += step) holes.push([0, y], [W, y]);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="hidden shrink-0 rotate-[-7deg] drop-shadow-md md:block">
      <mask id="stamp-perf">
        <rect width={W} height={H} fill="#fff" />
        {holes.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={4} fill="#000" />
        ))}
      </mask>
      <rect width={W} height={H} fill="var(--accent)" mask="url(#stamp-perf)" />
      <rect x={10} y={10} width={W - 20} height={H - 20} fill="none" stroke="#fff" strokeOpacity={0.45} />
      <g transform="translate(30 22) scale(1.5)">
        <path d={BUBBLE_A} fill="#fff" />
        <path d={BUBBLE_B} fill="var(--marker)" />
      </g>
      <text x={W / 2} y={H - 22} textAnchor="middle" fill="#fff" fontSize="14" fontStyle="italic" fontWeight={700} fontFamily="var(--font-display)">
        Par avion
      </text>
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}
