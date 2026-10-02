import { NavBar } from "./nav-bar";
import { AppHeader } from "./app-header";
import { NotificationScheduler } from "./notification-scheduler";
import { NotificationPermissionBanner } from "./notification-permission-banner";
import { getCurrentUser } from "@/lib/reminder/queries";
import { getPendingRequestCount } from "@/lib/connections/queries";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const [user, pendingConnectionCount] = await Promise.all([getCurrentUser(), getPendingRequestCount()]);

  return (
    <div className="flex min-h-svh flex-col sm:flex-row">
      <NavBar pendingConnectionCount={pendingConnectionCount} />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader
          name={user?.name || user?.email || "?"}
          email={user?.email ?? ""}
          avatarUrl={user?.avatarUrl ?? null}
        />
        <main className="flex-1 px-4 py-2 pb-28 sm:px-8 sm:py-6 max-w-2xl w-full mx-auto flex flex-col gap-6">
          <NotificationScheduler />
          <NotificationPermissionBanner />
          {children}
        </main>
      </div>
    </div>
  );
}
