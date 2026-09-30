import { SettingsForm } from "@/components/settings/settings-form";
import { AvatarUpload } from "@/components/settings/avatar-upload";
import { getCurrentUser } from "@/lib/reminder/queries";
import { SignOutButton } from "@/components/settings/sign-out-button";
import { PushNotificationSettings } from "@/components/settings/push-notification-settings";
import { Separator } from "@/components/ui/separator";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function SettingsPage() {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  const dict = getDictionary(locale);

  return (
    <div className="flex flex-col gap-6 max-w-md">
      <h1 className="font-heading text-xl font-bold tracking-tight">{dict.settings.title}</h1>

      {user && (
        <AvatarUpload
          userId={user.id}
          name={user.name || user.email}
          initialAvatarUrl={user.avatarUrl}
        />
      )}

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
