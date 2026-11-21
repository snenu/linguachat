import { MessagesSquare } from "lucide-react";

export const metadata = { title: "Chats" };

export default function ChatsIndex() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-ink-2">
      <MessagesSquare size={30} aria-hidden="true" />
      <p className="max-w-sm">Pick a conversation. Your coach checks your messages as you go, and every correction lands in your mistake log.</p>
    </div>
  );
}
