import { Languages, MousePointerClick, PenLine, SpellCheck } from "lucide-react";
import { LogoMark } from "@/components/ui/logo";

export const metadata = { title: "Chats" };

const TIPS = [
  { icon: SpellCheck, title: "Check before you send", body: "The check button shows a corrected sentence and why, before anyone sees it." },
  { icon: MousePointerClick, title: "Tap a message", body: "Reply, translate it into your language, listen to it, or correct your partner." },
  { icon: Languages, title: "Tap a word", body: "Get its meaning, reading and an example, then save it as a flashcard." },
  { icon: PenLine, title: "Coach notes", body: "After you send, a quiet note appears under messages that could be more natural." },
];

export default function ChatsIndex() {
  return (
    <div className="paper-grid flex flex-1 flex-col items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-surface shadow-md">
            <LogoMark size={46} />
          </span>
          <h2 className="mt-5 font-display text-2xl font-bold text-ink">Pick a conversation</h2>
          <p className="mt-1.5 max-w-sm text-ink-2">Your coach checks your messages as you go, and every correction lands in your mistake log.</p>
        </div>
        <ul className="mt-8 grid gap-2.5 sm:grid-cols-2">
          {TIPS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="rounded-xl border border-line bg-surface p-4 shadow-sm">
              <p className="flex items-center gap-2 text-sm font-bold text-ink">
                <Icon size={16} className="text-accent" aria-hidden="true" /> {title}
              </p>
              <p className="mt-1 text-sm text-ink-2">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
