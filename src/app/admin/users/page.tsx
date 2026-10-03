import { Users, UserPlus } from "lucide-react";
import { getAdminUsers } from "@/lib/admin/user-queries";
import { ADMIN_USERS_PAGE_SIZES, type AdminUsersPageSize } from "@/lib/admin/constants";
import { getDashboardData } from "@/lib/admin/queries";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { UserSearchBar } from "@/components/admin/user-search-bar";
import { PageSizeSelect } from "@/components/admin/page-size-select";
import { UsersTable } from "@/components/admin/users-table";
import { AdminPagination } from "@/components/admin/admin-pagination";

function parsePageSize(raw: string | undefined): AdminUsersPageSize {
  const n = Number(raw);
  return (ADMIN_USERS_PAGE_SIZES as readonly number[]).includes(n) ? (n as AdminUsersPageSize) : 20;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; pageSize?: string }>;
}) {
  const sp = await searchParams;
  const search = sp.search?.trim() ?? "";
  const page = Math.max(1, Number(sp.page) || 1);
  const pageSize = parsePageSize(sp.pageSize);

  // Reuses the dashboard loader purely for the two top-line summary
  // numbers (Total Users, New Today) — no duplicate query logic, same
  // single-source-of-truth dashboard data already computed in Phase 2.
  const [result, dashboard] = await Promise.all([
    getAdminUsers({ search, page, pageSize }),
    getDashboardData(),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  function buildHref(targetPage: number): string {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", String(targetPage));
    params.set("pageSize", String(pageSize));
    return `/admin/users?${params.toString()}`;
  }

  const from = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const to = Math.min(result.total, result.page * result.pageSize);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground">Manage and inspect Rymi users</p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-md">
        <AdminStatCard label="Total Users" value={dashboard.totalUsers} icon={Users} />
        <AdminStatCard label="New Today" value={dashboard.newUsersToday} icon={UserPlus} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <UserSearchBar initialValue={search} />
        <PageSizeSelect pageSize={result.pageSize} />
      </div>

      {result.total === 0 && search ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No users match your search.</p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Showing {from}–{to} of {result.total} users
          </p>
          <UsersTable users={result.users} />
          <AdminPagination page={result.page} totalPages={totalPages} buildHref={buildHref} />
        </>
      )}
    </div>
  );
}
