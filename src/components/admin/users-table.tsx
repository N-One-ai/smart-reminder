import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { AdminUserListItem } from "@/lib/admin/user-queries";

function formatJoined(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Desktop: a real table. Mobile: the same rows as stacked cards — same
 * data, no horizontally-scrolling table on small screens (per the
 * responsive requirement), and no separate query for either layout.
 */
export function UsersTable({ users }: { users: AdminUserListItem[] }) {
  if (users.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No users found.</p>;
  }

  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground uppercase tracking-wide">
              <th className="pb-2 pr-3 font-medium"></th>
              <th className="pb-2 pr-4 font-medium">Name</th>
              <th className="pb-2 pr-4 font-medium">Username</th>
              <th className="pb-2 pr-4 font-medium">Email</th>
              <th className="pb-2 pr-4 font-medium">Joined</th>
              <th className="pb-2 pr-4 font-medium text-right">Reminders</th>
              <th className="pb-2 pr-4 font-medium text-right">Connections</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="py-2.5 pr-3">
                  <Avatar size="sm">
                    {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt={u.name ?? ""} />}
                    <AvatarFallback>{(u.name || u.username || "?").charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </td>
                <td className="py-2.5 pr-4 font-medium truncate max-w-40">{u.name || "—"}</td>
                <td className="py-2.5 pr-4 text-muted-foreground truncate max-w-32">
                  {u.username ? `@${u.username}` : "—"}
                </td>
                <td className="py-2.5 pr-4 text-muted-foreground truncate max-w-56">{u.email}</td>
                <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap tabular-nums">
                  {formatJoined(u.createdAt)}
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums">{u.remindersCount}</td>
                <td className="py-2.5 pr-4 text-right tabular-nums">{u.connectionsCount}</td>
                <td className="py-2.5 text-right">
                  <a href={`/admin/users/${u.id}`} className="text-sm font-medium text-primary hover:underline">
                    View
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden flex flex-col gap-2">
        {users.map((u) => (
          <a
            key={u.id}
            href={`/admin/users/${u.id}`}
            className="flex items-center gap-3 rounded-xl border px-3 py-3"
          >
            <Avatar size="default">
              {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt={u.name ?? ""} />}
              <AvatarFallback>{(u.name || u.username || "?").charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 flex flex-col">
              <span className="text-sm font-semibold truncate">{u.name || "—"}</span>
              <span className="text-xs text-muted-foreground truncate">{u.email}</span>
              <span className="text-xs text-muted-foreground">
                {u.remindersCount} reminders · {u.connectionsCount} connections
              </span>
            </div>
          </a>
        ))}
      </div>
    </>
  );
}
