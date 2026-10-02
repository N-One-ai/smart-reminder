import { ConnectionsScreen } from "@/components/connections/connections-screen";
import { getIncomingRequests, getConnections } from "@/lib/connections/queries";
import { getCurrentUser } from "@/lib/reminder/queries";
import { redirect } from "next/navigation";

export default async function ConnectionsPage() {
  const [user, incomingRequests, connections] = await Promise.all([
    getCurrentUser(),
    getIncomingRequests(),
    getConnections(),
  ]);

  if (!user) redirect("/login");

  return (
    <ConnectionsScreen
      currentUserId={user.id}
      incomingRequests={incomingRequests}
      connections={connections}
    />
  );
}
