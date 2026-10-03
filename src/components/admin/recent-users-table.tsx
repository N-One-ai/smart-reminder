import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecentUser } from "@/lib/admin/queries";

/**
 * Email is shown here deliberately — an admin legitimately needs it for
 * account support (per the spec). It must never appear in an aggregate
 * chart or any component outside this admin-only, admin-authorized table.
 *
 * No "Status" column: profiles has no real status field (no active/
 * premium/verified data exists), so per the spec it's simply omitted
 * rather than filled with an invented value.
 */
export function RecentUsersTable({ users }: { users: RecentUser[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Users</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground uppercase tracking-wide">
              <th className="pb-2 pr-4 font-medium">Name</th>
              <th className="pb-2 pr-4 font-medium">Username</th>
              <th className="pb-2 pr-4 font-medium">Email</th>
              <th className="pb-2 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="py-2.5 pr-4 font-medium truncate max-w-40">{u.name || "—"}</td>
                <td className="py-2.5 pr-4 text-muted-foreground truncate max-w-32">
                  {u.username ? `@${u.username}` : "—"}
                </td>
                <td className="py-2.5 pr-4 text-muted-foreground truncate max-w-56">{u.email}</td>
                <td className="py-2.5 text-muted-foreground tabular-nums whitespace-nowrap">
                  {new Date(u.createdAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-muted-foreground">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
