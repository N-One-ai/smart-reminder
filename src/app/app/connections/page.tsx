import { ConnectionsScreen } from "@/components/connections/connections-screen";
import { getIncomingRequests, getConnections } from "@/lib/connections/queries";
import { getConversationSummaries } from "@/lib/chat/queries";
import { getCurrentUser } from "@/lib/reminder/queries";
import { redirect } from "next/navigation";

export default async function ConnectionsPage() {
  const [user, incomingRequests, connections, conversationSummaries] = await Promise.all([
    getCurrentUser(),
    getIncomingRequests(),
    getConnections(),
    getConversationSummaries(),
  ]);

  if (!user) redirect("/login");

  const unreadByUserId = Object.fromEntries(
    [...conversationSummaries.entries()].map(([otherUserId, summary]) => [otherUserId, summary.unreadCount])
  );

  return (
    <ConnectionsScreen
      currentUserId={user.id}
      incomingRequests={incomingRequests}
      connections={connections}
      unreadByUserId={unreadByUserId}
    />
  );
}
