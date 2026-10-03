import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import type { AdminUserDetail } from "@/lib/admin/user-queries";

/** Account metadata only — email/username/avatar/timezone/created_at. No
 * reminder or message content ever flows through this component. */
export function UserProfileCard({ user }: { user: AdminUserDetail }) {
  return (
    <Card>
      <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Avatar size="lg">
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name ?? ""} />}
          <AvatarFallback className="text-lg">
            {(user.name || user.username || "?").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="font-heading text-lg font-bold truncate">{user.name || "—"}</h1>
          {user.username && <p className="text-sm text-muted-foreground">@{user.username}</p>}
          <dl className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <Field label="Email" value={user.email} />
            <Field
              label="Joined"
              value={new Date(user.createdAt).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            />
            <Field label="Timezone" value={user.timezone} />
            <Field label="User ID" value={user.id} mono />
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={mono ? "text-xs font-mono text-muted-foreground truncate" : "truncate"}>{value}</dd>
    </div>
  );
}
