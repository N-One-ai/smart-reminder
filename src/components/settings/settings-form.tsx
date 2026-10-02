"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { updateProfile, updateUsername } from "@/lib/profile/actions";
import { NETWORK_ERROR_MESSAGE } from "@/lib/network-error";
import {
  TALL_INPUT_CLASS,
  TALL_SELECT_TRIGGER_CLASS,
  TALL_PILL_BUTTON_CLASS,
} from "@/lib/ui/form-controls";
import { cn } from "@/lib/utils";
import { useDictionary, useLocale } from "@/lib/i18n/locale-provider";
import { setLocale } from "@/lib/i18n/actions";
import { LOCALES, type Locale } from "@/lib/i18n/config";

const COMMON_TIMEZONES = [
  "Asia/Ho_Chi_Minh",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Tokyo",
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
];

// Some browsers' ICU data resolves a legacy IANA alias instead of the
// canonical zone name (e.g. Chromium often reports "Asia/Saigon" — same
// real timezone as "Asia/Ho_Chi_Minh", just an older name). Normalize the
// ones we expect our target users to hit so they match COMMON_TIMEZONES.
const TZ_ALIASES: Record<string, string> = {
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
};

const LOCALE_LABEL: Record<Locale, string> = {
  vi: "Tiếng Việt",
  en: "English",
};

export function SettingsForm({
  initialName,
  email,
  initialTimezone,
  initialUsername,
}: {
  initialName: string;
  email: string;
  initialTimezone: string;
  initialUsername: string | null;
}) {
  const router = useRouter();
  const dict = useDictionary();
  const locale = useLocale();
  const [name, setName] = useState(initialName);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [detected, setDetected] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [username, setUsername] = useState(initialUsername ?? "");
  const [usernameSaving, setUsernameSaving] = useState(false);

  // Auto-detect timezone on first load, but only offer it as a suggestion —
  // never silently override a value the user (or their stored profile) already
  // has. See prd-smart-reminder.md §A. Must run client-side only: Intl resolves
  // the *server's* tz during SSR, which would mismatch the browser's real value.
  //
  // Deliberately does NOT grow the Select's option list to fit an unlisted
  // detected value: changing a native <select>'s options and its selected value
  // in the same render causes the browser to transiently lose the match and
  // fire a stray onChange("") that clobbers state. Keeping the option list
  // static avoids that — an unlisted zone is just shown as plain text instead.
  useEffect(() => {
    const raw = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tz = TZ_ALIASES[raw] ?? raw;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with browser-only Intl API, see comment above
    setDetected(tz);
  }, []);

  const detectedDiffers = detected !== null && detected !== timezone;
  const detectedIsListed = detected !== null && COMMON_TIMEZONES.includes(detected);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const result = await updateProfile({ name, timezone });
        if (!result.ok) {
          toast.error(result.error.message);
          return;
        }
        toast.success(dict.toasts.settingsSaved);
      } catch {
        toast.error(NETWORK_ERROR_MESSAGE);
      }
    });
  }

  async function handleLocaleChange(next: Locale) {
    await setLocale(next);
    router.refresh();
  }

  async function handleSaveUsername(e: React.FormEvent) {
    e.preventDefault();
    setUsernameSaving(true);
    try {
      const result = await updateUsername(username);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      setUsername(result.data.username);
      toast.success(dict.toasts.settingsSaved);
      router.refresh();
    } catch {
      toast.error(NETWORK_ERROR_MESSAGE);
    } finally {
      setUsernameSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="rounded-xl border bg-card p-5 flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">{dict.settings.fullName}</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={TALL_INPUT_CLASS}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{dict.settings.email}</Label>
        <Input id="email" value={email} disabled className={TALL_INPUT_CLASS} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="username">{dict.connections.usernameLabel}</Label>
        <div className="flex items-center gap-2">
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            placeholder={dict.connections.usernamePlaceholder}
            maxLength={20}
            className={TALL_INPUT_CLASS}
          />
          <Button
            type="button"
            variant="outline"
            disabled={usernameSaving || username.trim() === (initialUsername ?? "")}
            onClick={handleSaveUsername}
            className={cn("shrink-0", TALL_PILL_BUTTON_CLASS)}
          >
            {usernameSaving && <Loader2 className="size-4 animate-spin" />}
            {dict.reminderForm.save}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{dict.connections.usernameHint}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="timezone">{dict.settings.timezone}</Label>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger id="timezone" className={cn("w-full", TALL_SELECT_TRIGGER_CLASS)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMMON_TIMEZONES.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {tz}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {detectedDiffers && detectedIsListed && (
          <button
            type="button"
            onClick={() => setTimezone(detected)}
            className="text-xs text-accent-foreground hover:underline self-start"
          >
            {dict.settings.detectedTimezone(detected)}
          </button>
        )}
        {detectedDiffers && !detectedIsListed && (
          <p className="text-xs text-muted-foreground">
            {dict.settings.detectedTimezoneUnlisted(detected)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="language">{dict.settings.language}</Label>
        <Select value={locale} onValueChange={(value) => handleLocaleChange(value as Locale)}>
          <SelectTrigger id="language" className={cn("w-full", TALL_SELECT_TRIGGER_CLASS)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOCALES.map((l) => (
              <SelectItem key={l} value={l}>
                {LOCALE_LABEL[l]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isPending} className={cn("mt-1", TALL_PILL_BUTTON_CLASS)}>
        {dict.settings.save}
      </Button>
    </form>
  );
}
