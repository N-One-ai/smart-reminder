import { requireAdmin } from "@/lib/admin/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";

/**
 * Every /admin page renders through this layout, and requireAdmin() is the
 * actual authorization boundary for the whole area — src/proxy.ts only
 * adds /admin to its authenticated-only prefixes as defense-in-depth (it
 * redirects logged-out requests early, cheaply), it is never relied on by
 * itself. A normal logged-in user reaching this layout gets notFound()
 * (404), not a redirect — see requireAdmin()'s own comment for why.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex min-h-svh flex-col md:flex-row bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader />
        <main className="flex-1 px-4 py-4 md:px-8 md:py-6 max-w-6xl w-full mx-auto flex flex-col gap-6">
          {children}
        </main>
      </div>
    </div>
  );
}
