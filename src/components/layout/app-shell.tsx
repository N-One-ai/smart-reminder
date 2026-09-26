import { NavBar } from "./nav-bar";
import { UserMenu } from "./user-menu";
import { NotificationScheduler } from "./notification-scheduler";
import { NotificationPermissionBanner } from "./notification-permission-banner";
import { getCurrentUser } from "@/lib/reminder/queries";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-svh flex-col sm:flex-row">
      <NavBar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-end gap-3 px-4 py-3 sm:px-8">
          <UserMenu name={user?.name || user?.email || "?"} email={user?.email ?? ""} />
        </header>
        <main className="flex-1 px-4 py-2 pb-28 sm:px-8 sm:py-6 max-w-2xl w-full mx-auto flex flex-col gap-6">
          <NotificationScheduler />
          <NotificationPermissionBanner />
          {children}
        </main>
      </div>
    </div>
  );
}
