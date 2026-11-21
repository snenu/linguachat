"use client";

import { Ban, Check, Flag, MessagesSquare, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, FormError, Select, Textarea } from "@/components/ui/form";
import { LangTag } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/client/api";
import type { Candidate } from "@/lib/client/types";
import { languageName } from "@/lib/languages";
import { activeLabel, MatchRing, scoreWithPresence } from "./partner-card";

export function ProfileDialog({
  candidate,
  online,
  onClose,
  onChanged,
}: {
  candidate: Candidate | null;
  online: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [intro, setIntro] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "report" | "block">("view");
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");

  if (!candidate) return <Dialog open={false} onClose={onClose} title="Profile">{null}</Dialog>;
  const p = candidate.profile;
  const score = scoreWithPresence(candidate, online);

  async function run(label: string, fn: () => Promise<unknown>, success: string) {
    setBusy(label);
    setError(null);
    try {
      await fn();
      toast(success);
      onChanged();
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setBusy(null);
    }
  }

  const close = () => {
    setMode("view");
    setIntro("");
    setError(null);
    onClose();
  };

  return (
    <Dialog open={!!candidate} onClose={close} title={mode === "report" ? `Report ${p.name}` : mode === "block" ? `Block ${p.name}?` : p.name} wide>
      {mode === "view" && (
        <div className="flex flex-col gap-5">
          <div className="-mx-5 -mt-4 flex items-center gap-4 border-b border-line bg-paper px-5 py-5">
            <Avatar name={p.name} src={p.avatarUrl} size={72} online={online} />
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${online ? "font-semibold text-mint" : "text-ink-3"}`}>{activeLabel(p.lastActiveAt, online)}</p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] items-center gap-x-2.5 gap-y-1.5 text-sm">
                <dt className="text-ink-3">Speaks</dt>
                <dd className="flex flex-wrap gap-1">
                  {p.nativeLanguages.map((l) => (
                    <LangTag key={l} code={l} />
                  ))}
                </dd>
                <dt className="text-ink-3">Learning</dt>
                <dd>
                  <LangTag code={p.targetLanguage} level={p.targetLevel} />
                </dd>
              </dl>
            </div>
            <div className="flex flex-col items-center gap-1">
              <MatchRing score={score} size={68} />
              <span className="text-xs font-semibold text-ink-2">{score}% match</span>
            </div>
          </div>

          {p.bio && <p className="border-l-[3px] border-marker pl-3.5 text-ink">{p.bio}</p>}

          {candidate.reasons.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-ink">Why you match</h3>
              <ul className="mt-2 flex flex-col gap-1.5 text-sm text-ink-2">
                {candidate.reasons.map((r) => (
                  <li key={r} className="flex items-start gap-2">
                    <Check size={15} strokeWidth={3} className="mt-0.5 shrink-0 text-mint" aria-hidden="true" />
                    {r}
                  </li>
                ))}
                {online && (
                  <li className="flex items-start gap-2">
                    <span className="live-ring mt-1.5 ml-1 h-2 w-2 shrink-0 rounded-full bg-mint" aria-hidden="true" />
                    <span className="ml-0.5">Online right now</span>
                  </li>
                )}
              </ul>
            </div>
          )}

          {p.interests.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-ink">
                Interests
                {candidate.sharedInterests.length > 0 && (
                  <span className="ml-2 font-normal text-ink-3">{candidate.sharedInterests.length} in common</span>
                )}
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.interests.map((i) => (
                  <span
                    key={i}
                    className={`rounded-full border px-2.5 py-0.5 text-sm ${
                      candidate.sharedInterests.includes(i) ? "border-accent-line bg-accent-wash font-semibold text-accent-ink" : "border-line text-ink-2"
                    }`}
                  >
                    {i}
                  </span>
                ))}
              </div>
            </div>
          )}

          {p.goals.length > 0 && (
            <p className="flex flex-wrap items-center gap-1.5 text-sm text-ink-2">
              <Target size={15} className="text-ink-3" aria-hidden="true" />
              Learning for {p.goals.join(", ").toLowerCase()}
            </p>
          )}

          <FormError message={error} />

          {candidate.relation === "partner" && (
            <Button size="lg" icon={<MessagesSquare size={17} />} onClick={() => router.push(`/app/chats/${p.nexconnId}`)}>
              Open chat
            </Button>
          )}
          {candidate.relation === "none" && (
            <div className="flex flex-col gap-3 rounded-lg border border-accent-line bg-accent-wash/60 p-4">
              <Field label="Say hello (optional)" htmlFor="intro" hint={`Tell ${p.name} why you'd like to practise together.`}>
                <Textarea
                  id="intro"
                  value={intro}
                  maxLength={300}
                  onChange={(e) => setIntro(e.target.value)}
                  placeholder={`Hi! I speak ${p.targetLanguage ? languageName(p.targetLanguage) : "your target language"} and would love to practise ${p.nativeLanguages.map(languageName).join(" or ")} with you.`}
                />
              </Field>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-ink-3 tabular-nums">{intro.length}/300</span>
                <Button
                  loading={busy === "request"}
                  icon={<MessagesSquare size={16} />}
                  onClick={() => run("request", () => api("/api/requests", { body: { toUserId: p.id, intro } }), `Request sent to ${p.name}`)}
                >
                  Send chat request
                </Button>
              </div>
            </div>
          )}
          {candidate.relation === "requested" && candidate.requestId && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-paper p-4">
              <p className="text-sm text-ink-2">Request sent. You&apos;ll hear the moment {p.name} answers.</p>
              <Button
                variant="secondary"
                size="sm"
                loading={busy === "cancel"}
                onClick={() => run("cancel", () => api(`/api/requests/${candidate.requestId}`, { body: { action: "cancel" } }), "Request cancelled")}
              >
                Cancel request
              </Button>
            </div>
          )}
          {candidate.relation === "incoming" && candidate.requestId && (
            <div className="flex flex-col gap-3 rounded-lg border border-marker/60 bg-marker-wash p-4">
              <p className="text-sm font-semibold text-ink">{p.name} wants to chat with you.</p>
              <div className="flex flex-wrap gap-3">
                <Button
                  loading={busy === "accept"}
                  onClick={async () => {
                    const ok = await run("accept", () => api(`/api/requests/${candidate.requestId}`, { body: { action: "accept" } }), `You and ${p.name} are now partners`);
                    if (ok) router.push(`/app/chats/${p.nexconnId}`);
                  }}
                >
                  Accept and chat
                </Button>
                <Button
                  variant="secondary"
                  loading={busy === "decline"}
                  onClick={() => run("decline", () => api(`/api/requests/${candidate.requestId}`, { body: { action: "decline" } }), "Request declined")}
                >
                  Decline
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            <Button variant="quiet" size="sm" icon={<Ban size={15} />} onClick={() => setMode("block")}>
              Block
            </Button>
            <Button variant="quiet" size="sm" icon={<Flag size={15} />} onClick={() => setMode("report")}>
              Report
            </Button>
          </div>
        </div>
      )}

      {mode === "block" && (
        <div className="animate-ink-in flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-lg border border-red/25 bg-red-wash p-4">
            <Ban size={20} className="mt-0.5 shrink-0 text-red" aria-hidden="true" />
            <p className="text-ink">
              {p.name} won&apos;t be able to message you or see you in partner search, and any pending requests between you are cancelled. You can
              unblock them later in Settings.
            </p>
          </div>
          <FormError message={error} />
          <div className="flex flex-wrap gap-3">
            <Button
              variant="danger"
              loading={busy === "block"}
              onClick={async () => {
                if (await run("block", () => api("/api/blocks", { body: { userId: p.id } }), `${p.name} is blocked`)) close();
              }}
            >
              Block {p.name}
            </Button>
            <Button variant="secondary" onClick={() => setMode("view")}>
              Keep chatting
            </Button>
          </div>
        </div>
      )}

      {mode === "report" && (
        <div className="animate-ink-in flex flex-col gap-4">
          <Field label="What's wrong?" htmlFor="reason">
            <Select id="reason" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="spam">Spam or advertising</option>
              <option value="harassment">Harassment or hate</option>
              <option value="inappropriate">Sexual or inappropriate content</option>
              <option value="underage">Seems to be under 16</option>
              <option value="other">Something else</option>
            </Select>
          </Field>
          <Field label="Details (optional)" htmlFor="details" hint="Reports are private. We also block this person for you.">
            <Textarea id="details" value={details} maxLength={1000} onChange={(e) => setDetails(e.target.value)} />
          </Field>
          <FormError message={error} />
          <div className="flex flex-wrap gap-3">
            <Button
              variant="danger"
              loading={busy === "report"}
              onClick={async () => {
                if (await run("report", () => api("/api/reports", { body: { userId: p.id, reason, details, alsoBlock: true } }), "Report sent. This person is now blocked.")) close();
              }}
            >
              Send report and block
            </Button>
            <Button variant="secondary" onClick={() => setMode("view")}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
