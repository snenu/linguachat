"use client";

import { usePathname } from "next/navigation";
import { ChannelList } from "@/components/chat/channel-list";

export default function ChatsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const inThread = pathname !== "/app/chats";
  return (
    <div className="flex h-[calc(100dvh-3.5rem-4rem)] min-h-0 lg:h-screen">
      <aside className={`${inThread ? "hidden lg:flex" : "flex"} w-full shrink-0 flex-col border-r border-line bg-surface lg:w-80`}>
        <div className="border-b border-line px-4 py-4">
          <h1 className="font-display text-xl font-semibold text-ink">Chats</h1>
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
          <ChannelList />
        </div>
      </aside>
      <section className={`${inThread ? "flex" : "hidden lg:flex"} min-w-0 flex-1 flex-col bg-paper`}>{children}</section>
    </div>
  );
}
