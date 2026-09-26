import { SettingsForm } from "@/components/settings/settings-form";
import { getCurrentUser } from "@/lib/reminder/queries";
import { SignOutButton } from "@/components/settings/sign-out-button";
import { PushNotificationSettings } from "@/components/settings/push-notification-settings";
import { Separator } from "@/components/ui/separator";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col gap-6 max-w-md">
      <h1 className="text-xl font-semibold tracking-tight">Cài đặt</h1>

      <SettingsForm
        initialName={user?.name ?? ""}
        email={user?.email ?? ""}
        initialTimezone={user?.timezone ?? "Asia/Ho_Chi_Minh"}
      />

      <Separator />

      <PushNotificationSettings />

      <Separator />

      <SignOutButton />
    </div>
  );
}
