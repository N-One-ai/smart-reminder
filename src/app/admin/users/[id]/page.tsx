import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminUserDetail } from "@/lib/admin/user-queries";
import { UserProfileCard } from "@/components/admin/user-profile-card";
import { UserStats } from "@/components/admin/user-stats";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getAdminUserDetail(id);

  // Invalid ID, deleted profile, or anything else that isn't a real
  // existing user all collapse to the same standard 404 — this must not
  // reveal whether an ID is well-formed but missing vs. malformed.
  if (!user) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/users" className="text-sm text-muted-foreground hover:text-foreground w-fit">
        ← Back to Users
      </Link>
      <UserProfileCard user={user} />
      <UserStats user={user} />
    </div>
  );
}
