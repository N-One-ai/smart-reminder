import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChatScreen } from "@/components/chat/chat-screen";
import { getConversationDetail } from "@/lib/chat/queries";
import { getCurrentUser } from "@/lib/reminder/queries";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { redirect } from "next/navigation";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  if (!user) redirect("/login");

  const dict = getDictionary(locale);
  const detail = await getConversationDetail(id);

  if (!detail) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-muted-foreground">{dict.chat.conversationNotFound}</p>
        <Button asChild variant="outline">
          <Link href="/app/connections">{dict.chat.back}</Link>
        </Button>
      </div>
    );
  }

  return (
    <ChatScreen
      conversationId={detail.conversationId}
      currentUserId={user.id}
      otherUser={detail.otherUser}
      initialMessages={detail.messages}
    />
  );
}
