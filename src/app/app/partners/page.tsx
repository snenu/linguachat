"use client";

import { Search, UsersRound } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import useSWR from "swr";
import { useMe, usePresence } from "@/components/app/providers";
import { activeLabel, PartnerCard, scoreWithPresence } from "@/components/partners/partner-card";
import { ProfileDialog } from "@/components/partners/profile-dialog";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Chip, Input, Select } from "@/components/ui/form";
import { EmptyState, LangTag, PageHeader } from "@/components/ui/misc";
import { PageLoader } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/client/api";
import type { Candidate, RequestItem } from "@/lib/client/types";
import { INTERESTS, LANGUAGES, LEVELS, languageName } from "@/lib/languages";

export default function PartnersPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Partners />
    </Suspense>
  );
}

function Partners() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = params.get("tab") === "requests" ? "requests" : "discover";
  const { data: reqs, mutate: refreshReqs } = useSWR<{ incoming: RequestItem[]; outgoing: RequestItem[] }>("/api/requests");
  const incoming = reqs?.incoming.length ?? 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      <PageHeader title="Partners" description="Native speakers of the language you're learning who want to learn yours." />
      <div role="tablist" aria-label="Partners" className="mt-5 flex gap-1 border-b border-line">
        {(
          [
            ["discover", "Find partners"],
            ["requests", `Requests${incoming ? ` (${incoming})` : ""}`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => router.replace(id === "discover" ? "/app/partners" : "/app/partners?tab=requests")}
            className={`-mb-px border-b-2 px-3 py-2.5 text-sm ${tab === id ? "border-ink font-semibold text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="pt-6">{tab === "discover" ? <Discover /> : <Requests data={reqs} refresh={() => void refreshReqs()} />}</div>
    </div>
  );
}

function Discover() {
  const { me } = useMe();
  const [lang, setLang] = useState(me.targetLanguage ?? "en");
  const [levels, setLevels] = useState<string[]>([]);
  const [interest, setInterest] = useState("");
  const [tandem, setTandem] = useState(false);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Candidate | null>(null);

  const query = new URLSearchParams({ lang });
  if (levels.length) query.set("levels", levels.join(","));
  if (interest) query.set("interest", interest);
  if (tandem) query.set("tandem", "1");
  if (q.trim()) query.set("q", q.trim());
  const { data, isLoading, mutate } = useSWR<{ candidates: Candidate[] }>(`/api/partners?${query}`, { keepPreviousData: true });
  const online = usePresence((data?.candidates ?? []).map((c) => c.profile.nexconnId));

  const list = useMemo(() => {
    const items = (data?.candidates ?? []).filter((c) => !onlineOnly || online[c.profile.nexconnId]);
    return items.sort((a, b) => scoreWithPresence(b, !!online[b.profile.nexconnId]) - scoreWithPresence(a, !!online[a.profile.nexconnId]));
  }, [data, online, onlineOnly]);

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside aria-label="Filters" className="flex flex-col gap-5">
        <label className="relative block">
          <span className="sr-only">Search by name</span>
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" aria-hidden="true" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" className="pl-9" />
        </label>
        <div>
          <label htmlFor="lang" className="text-sm font-semibold text-ink">
            Native speakers of
          </label>
          <Select id="lang" value={lang} onChange={(e) => setLang(e.target.value)} className="mt-1.5">
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
                {l.code === me.targetLanguage ? " (you're learning)" : ""}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">Their level in the language they learn</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {LEVELS.map((l) => (
              <Chip key={l} selected={levels.includes(l)} onToggle={() => setLevels((v) => (v.includes(l) ? v.filter((x) => x !== l) : [...v, l]))}>
                {l}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="interest" className="text-sm font-semibold text-ink">
            Interest
          </label>
          <Select id="interest" value={interest} onChange={(e) => setInterest(e.target.value)} className="mt-1.5">
            <option value="">Any interest</option>
            {INTERESTS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-2.5">
          <label className="flex items-center gap-2.5 text-sm text-ink">
            <input type="checkbox" checked={tandem} onChange={(e) => setTandem(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
            Only people learning {me.nativeLanguages.map(languageName).join(" or ")}
          </label>
          <label className="flex items-center gap-2.5 text-sm text-ink">
            <input type="checkbox" checked={onlineOnly} onChange={(e) => setOnlineOnly(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
            Online now
          </label>
        </div>
      </aside>

      <section aria-label="Matches" aria-busy={isLoading}>
        {!data ? (
          <PageLoader label="Finding partners" />
        ) : list.length === 0 ? (
          <EmptyState icon={<UsersRound size={22} />} title="No matches for these filters">
            Try removing a filter. If you&apos;re early, {languageName(lang)} speakers may not have joined yet; the AI tutor is always available.
          </EmptyState>
        ) : (
          <>
            <p className="mb-3 text-sm text-ink-2">
              {list.length} {list.length === 1 ? "match" : "matches"}, best first. Scores weigh tandem fit, shared interests, level balance and who&apos;s online.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((c) => (
                <PartnerCard key={c.profile.id} candidate={c} online={!!online[c.profile.nexconnId]} onOpen={() => setOpen(c)} />
              ))}
            </div>
          </>
        )}
      </section>

      <ProfileDialog
        candidate={open ? (data?.candidates.find((c) => c.profile.id === open.profile.id) ?? open) : null}
        online={open ? !!online[open.profile.nexconnId] : false}
        onClose={() => setOpen(null)}
        onChanged={() => void mutate()}
      />
    </div>
  );
}

function Requests({ data, refresh }: { data?: { incoming: RequestItem[]; outgoing: RequestItem[] }; refresh: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const online = usePresence([...(data?.incoming ?? []), ...(data?.outgoing ?? [])].map((r) => r.candidate.profile.nexconnId));

  async function act(r: RequestItem, action: "accept" | "decline" | "cancel") {
    setBusy(r.id + action);
    try {
      await api(`/api/requests/${r.id}`, { body: { action } });
      refresh();
      if (action === "accept") {
        toast(`You and ${r.candidate.profile.name} are now partners`);
        router.push(`/app/chats/${r.candidate.profile.nexconnId}`);
      } else toast(action === "decline" ? "Request declined" : "Request cancelled");
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusy(null);
    }
  }

  if (!data) return <PageLoader />;
  const row = (r: RequestItem, kind: "in" | "out") => {
    const p = r.candidate.profile;
    const isOnline = !!online[p.nexconnId];
    return (
      <li key={r.id} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-start">
        <Avatar name={p.name} src={p.avatarUrl} size={48} online={isOnline} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">
            {p.name} <span className="font-normal text-ink-3">· {scoreWithPresence(r.candidate, isOnline)}% match</span>
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-2">
            Speaks {p.nativeLanguages.map((l) => <LangTag key={l} code={l} />)} learning <LangTag code={p.targetLanguage} level={p.targetLevel} />
            <span className="text-ink-3">{activeLabel(p.lastActiveAt, isOnline)}</span>
          </div>
          {r.intro && <p className="mt-2 rounded-md bg-paper px-3 py-2 text-ink">&ldquo;{r.intro}&rdquo;</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          {kind === "in" ? (
            <>
              <Button size="sm" loading={busy === r.id + "accept"} onClick={() => act(r, "accept")}>
                Accept
              </Button>
              <Button size="sm" variant="secondary" loading={busy === r.id + "decline"} onClick={() => act(r, "decline")}>
                Decline
              </Button>
            </>
          ) : (
            <Button size="sm" variant="secondary" loading={busy === r.id + "cancel"} onClick={() => act(r, "cancel")}>
              Cancel
            </Button>
          )}
        </div>
      </li>
    );
  };
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="font-display text-xl font-semibold text-ink">Waiting for you</h2>
        {data.incoming.length === 0 ? (
          <p className="mt-2 text-ink-2">No requests right now. When someone asks to chat, it appears here instantly.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">{data.incoming.map((r) => row(r, "in"))}</ul>
        )}
      </section>
      <section>
        <h2 className="font-display text-xl font-semibold text-ink">Sent by you</h2>
        {data.outgoing.length === 0 ? (
          <p className="mt-2 text-ink-2">You haven&apos;t sent any requests that are still waiting.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">{data.outgoing.map((r) => row(r, "out"))}</ul>
        )}
      </section>
    </div>
  );
}
