"use client";

import { Inbox, Search, Send, SlidersHorizontal, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import useSWR from "swr";
import { useMe, usePresence } from "@/components/app/providers";
import { activeLabel, MatchRing, PartnerCard, scoreWithPresence } from "@/components/partners/partner-card";
import { ProfileDialog } from "@/components/partners/profile-dialog";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonClass } from "@/components/ui/button";
import { Chip, Input, Select } from "@/components/ui/form";
import { EmptyState, LangTag, PageHeader, Skeleton } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/client/api";
import type { Candidate, RequestItem } from "@/lib/client/types";
import { INTERESTS, LANGUAGES, LEVELS, languageName } from "@/lib/languages";

export default function PartnersPage() {
  return (
    <Suspense fallback={<GridSkeleton />}>
      <Partners />
    </Suspense>
  );
}

function GridSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-13 w-13 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <Skeleton className="h-3.5 w-4/5" />
          <Skeleton className="h-3.5 w-3/5" />
        </div>
      ))}
    </div>
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
      <PageHeader
        title="Partners"
        description="Native speakers of the language you're learning who want to learn yours."
        action={
          <div role="tablist" aria-label="Partners" className="flex rounded-full border border-line bg-surface p-1 shadow-sm">
            {(
              [
                ["discover", "Find partners", 0],
                ["requests", "Requests", incoming],
              ] as const
            ).map(([id, label, count]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => router.replace(id === "discover" ? "/app/partners" : "/app/partners?tab=requests")}
                className={`flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-[background-color,color] ${
                  tab === id ? "bg-ink text-white shadow-sm" : "text-ink-2 hover:text-ink"
                }`}
              >
                {label}
                {count > 0 && (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-marker px-1.5 text-xs font-bold text-ink">{count}</span>
                )}
              </button>
            ))}
          </div>
        }
      />
      <div key={tab} className="animate-ink-in">
        {tab === "discover" ? <Discover /> : <Requests data={reqs} refresh={() => void refreshReqs()} />}
      </div>
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
  const [filtersOpen, setFiltersOpen] = useState(false);

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
  const onlineCount = (data?.candidates ?? []).filter((c) => online[c.profile.nexconnId]).length;

  const active = levels.length + (interest ? 1 : 0) + (tandem ? 1 : 0) + (onlineOnly ? 1 : 0) + (lang !== (me.targetLanguage ?? "en") ? 1 : 0);
  const reset = () => {
    setLevels([]);
    setInterest("");
    setTandem(false);
    setOnlineOnly(false);
    setLang(me.targetLanguage ?? "en");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[272px_1fr]">
      <div className="flex gap-2 lg:hidden">
        <label className="relative block flex-1">
          <span className="sr-only">Search by name</span>
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" aria-hidden="true" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" className="pl-9" />
        </label>
        <Button variant="secondary" className="h-11" icon={<SlidersHorizontal size={16} />} aria-expanded={filtersOpen} onClick={() => setFiltersOpen((v) => !v)}>
          Filters
          {active > 0 && <span className="rounded-full bg-accent px-1.5 text-xs text-white">{active}</span>}
        </Button>
      </div>

      <aside
        aria-label="Filters"
        className={`${filtersOpen ? "flex animate-ink-in" : "hidden"} flex-col gap-5 self-start rounded-xl border border-line bg-surface p-4 shadow-sm lg:sticky lg:top-6 lg:flex`}
      >
        <label className="relative hidden lg:block">
          <span className="sr-only">Search by name</span>
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" aria-hidden="true" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" className="pl-9" />
        </label>
        <div>
          <label htmlFor="lang" className="text-sm font-bold text-ink">
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
          <p className="text-sm font-bold text-ink">Their level in the language they learn</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {LEVELS.map((l) => (
              <Chip key={l} selected={levels.includes(l)} onToggle={() => setLevels((v) => (v.includes(l) ? v.filter((x) => x !== l) : [...v, l]))}>
                {l}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="interest" className="text-sm font-bold text-ink">
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
        <div className="flex flex-col gap-1 border-t border-line pt-4">
          <Toggle checked={tandem} onChange={setTandem} label={`Learning ${me.nativeLanguages.map(languageName).join(" or ")}`} hint="People who want your language" />
          <Toggle
            checked={onlineOnly}
            onChange={setOnlineOnly}
            label="Online now"
            hint={onlineCount ? `${onlineCount} ${onlineCount === 1 ? "person" : "people"} online` : "Nobody in this list right now"}
          />
        </div>
        {active > 0 && (
          <Button variant="quiet" size="sm" icon={<X size={15} />} onClick={reset} className="self-start">
            Clear filters
          </Button>
        )}
      </aside>

      <section aria-label="Matches" aria-busy={isLoading}>
        {!data ? (
          <GridSkeleton />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<UsersRound size={22} />}
            title="No matches for these filters"
            action={
              <div className="flex flex-wrap gap-2">
                {active > 0 && (
                  <Button variant="secondary" onClick={reset}>
                    Clear filters
                  </Button>
                )}
                <Link href="/app/tutor" className={buttonClass("ghost")}>
                  Practise with the AI tutor
                </Link>
              </div>
            }
          >
            If you&apos;re early, {languageName(lang)} speakers may not have joined yet. The AI tutor is always available, and new learners join every day.
          </EmptyState>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-display text-lg font-bold text-ink">
                {list.length} {list.length === 1 ? "match" : "matches"}
                <span className="ml-2 font-sans text-sm font-normal text-ink-3">best first</span>
              </p>
              <p className="text-xs text-ink-3">Ranked by tandem fit, shared interests, level balance and who&apos;s online.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
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

/** A labelled switch built on a native checkbox. */
function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md py-2">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {hint && <span className="block text-xs text-ink-3">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className="relative h-6 w-10 shrink-0 rounded-full bg-line-strong transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-4"
      />
    </label>
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

  if (!data) {
    return (
      <div className="flex flex-col gap-3" aria-hidden="true">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const row = (r: RequestItem, kind: "in" | "out") => {
    const p = r.candidate.profile;
    const isOnline = !!online[p.nexconnId];
    const score = scoreWithPresence(r.candidate, isOnline);
    return (
      <li key={r.id} className="animate-ink-in flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 shadow-sm sm:flex-row sm:items-start sm:p-5">
        <div className="flex items-start gap-3 sm:contents">
          <Avatar name={p.name} src={p.avatarUrl} size={52} online={isOnline} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <p className="font-bold text-ink">{p.name}</p>
              <span className="rounded-full bg-accent-wash px-2 py-0.5 text-xs font-semibold text-accent-ink">{score}% match</span>
              <span className={`text-xs ${isOnline ? "font-semibold text-mint" : "text-ink-3"}`}>{activeLabel(p.lastActiveAt, isOnline)}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
              Speaks
              {p.nativeLanguages.map((l) => (
                <LangTag key={l} code={l} />
              ))}
              <span className="ml-1">learning</span>
              <LangTag code={p.targetLanguage} level={p.targetLevel} />
            </div>
            {r.intro && (
              <p className="mt-3 max-w-xl rounded-2xl rounded-tl-md border border-line bg-paper px-3.5 py-2.5 text-ink">{r.intro}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-2 sm:flex-col">
          {kind === "in" ? (
            <>
              <Button loading={busy === r.id + "accept"} onClick={() => act(r, "accept")} className="flex-1 sm:flex-none">
                Accept
              </Button>
              <Button variant="secondary" loading={busy === r.id + "decline"} onClick={() => act(r, "decline")} className="flex-1 sm:flex-none">
                Decline
              </Button>
            </>
          ) : (
            <Button variant="secondary" loading={busy === r.id + "cancel"} onClick={() => act(r, "cancel")}>
              Cancel
            </Button>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
      <section>
        <h2 className="flex items-center gap-2.5 font-display text-xl font-bold text-ink">
          <Inbox size={20} className="text-accent" aria-hidden="true" /> Waiting for you
          {data.incoming.length > 0 && <span className="rounded-full bg-marker px-2 text-sm text-ink">{data.incoming.length}</span>}
        </h2>
        {data.incoming.length === 0 ? (
          <div className="mt-3">
            <EmptyState icon={<Inbox size={22} />} title="No requests right now">
              When someone asks to chat, it appears here instantly. Meanwhile, send a request to someone who looks like a good match.
            </EmptyState>
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">{data.incoming.map((r) => row(r, "in"))}</ul>
        )}
      </section>
      <section>
        <h2 className="flex items-center gap-2.5 font-display text-xl font-bold text-ink">
          <Send size={18} className="text-ink-3" aria-hidden="true" /> Sent by you
        </h2>
        {data.outgoing.length === 0 ? (
          <p className="mt-3 text-sm text-ink-2">You haven&apos;t sent any requests that are still waiting.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2.5">
            {data.outgoing.map((r) => {
              const p = r.candidate.profile;
              const isOnline = !!online[p.nexconnId];
              return (
                <li key={r.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 shadow-sm">
                  <Avatar name={p.name} src={p.avatarUrl} size={40} online={isOnline} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{p.name}</p>
                    <p className="text-xs text-ink-3">Waiting for an answer</p>
                  </div>
                  <MatchRing score={scoreWithPresence(r.candidate, isOnline)} size={40} />
                  <Button size="sm" variant="quiet" loading={busy === r.id + "cancel"} onClick={() => act(r, "cancel")}>
                    Cancel
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
