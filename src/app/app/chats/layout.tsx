"use client";

import { UserPlus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChannelList } from "@/components/chat/channel-list";

export default function ChatsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const inThread = pathname !== "/app/chats";
  return (
    <div className="flex h-[calc(100dvh-3.5rem-4rem)] min-h-0 lg:h-screen">
      <aside className={`${inThread ? "hidden lg:flex" : "flex"} w-full shrink-0 flex-col border-r border-line bg-surface lg:w-[22rem]`}>
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-2">
          <h1 className="font-display text-2xl font-bold text-ink">Chats</h1>
          <Link
            href="/app/partners"
            aria-label="Find partners"
            title="Find partners"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line-strong text-ink-2 transition-colors hover:border-accent hover:text-accent-ink"
          >
            <UserPlus size={17} />
          </Link>
        </div>
        <div className="scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto">
          <ChannelList />
        </div>
      </aside>
      <section className={`${inThread ? "flex" : "hidden lg:flex"} min-w-0 flex-1 flex-col bg-paper`}>{children}</section>
    </div>
  );
}
