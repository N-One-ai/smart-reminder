import Link from "next/link";
import { Users, UserPlus, CalendarCheck, Link2 } from "lucide-react";
import { getDashboardData } from "@/lib/admin/queries";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { RegistrationChart } from "@/components/admin/registration-chart";
import { ReminderOverview } from "@/components/admin/reminder-overview";
import { ConnectionOverview } from "@/components/admin/connection-overview";
import { RecentUsersTable } from "@/components/admin/recent-users-table";
import { SubscriptionStatusCard } from "@/components/admin/subscription-status-card";

// getDashboardData() re-verifies admin authorization itself (see
// lib/admin/queries.ts) on top of the layout's requireAdmin() — this page
// never assumes reaching it once already proved authorization for the data
// fetch that follows.
export default async function AdminDashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Product-level analytics, aggregate only.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Total Users" value={data.totalUsers} icon={Users} />
        <AdminStatCard label="New Today" value={data.newUsersToday} icon={Users} />
        <AdminStatCard label="New This Week" value={data.newUsersThisWeek} icon={Users} />
        <AdminStatCard label="New This Month" value={data.newUsersThisMonth} icon={Users} />
        <AdminStatCard label="Total Reminders" value={data.reminders.total} icon={CalendarCheck} />
        <AdminStatCard label="Shared Reminders" value={data.reminders.shared} icon={Link2} />
        <AdminStatCard label="Total Connections" value={data.connections.total} icon={UserPlus} />
        <AdminStatCard label="Pending Connections" value={data.connections.pending} icon={UserPlus} />
      </div>

      <RegistrationChart data={data.registrationTrend} />

      <div>
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Reminder creation source
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <AdminStatCard label="AI" value={data.reminders.aiCreated} icon={CalendarCheck} />
          <AdminStatCard label="Manual" value={data.reminders.manualCreated} icon={CalendarCheck} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <ReminderOverview reminders={data.reminders} />
        <ConnectionOverview connections={data.connections} />
      </div>

      <SubscriptionStatusCard />

      <div className="flex flex-col gap-2">
        <RecentUsersTable users={data.recentUsers} />
        <Link href="/admin/users" className="text-sm font-medium text-primary hover:underline w-fit">
          View all users →
        </Link>
      </div>
    </div>
  );
}
