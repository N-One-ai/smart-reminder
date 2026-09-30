"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ReminderOccurrence } from "@/types/reminder";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { completeOccurrence, deleteReminder } from "@/lib/reminder/actions";
import { NETWORK_ERROR_MESSAGE } from "@/lib/network-error";
import { useDictionary } from "@/lib/i18n/locale-provider";

export function ReminderListItem({ occurrence }: { occurrence: ReminderOccurrence }) {
  const router = useRouter();
  const dict = useDictionary();
  const [isPending, startTransition] = useTransition();
  const { reminder, occurrenceDate, isCompleted } = occurrence;

  function handleToggleComplete() {
    startTransition(async () => {
      try {
        const result = await completeOccurrence(reminder.id, occurrenceDate);
        if (!result.ok) {
          toast.error(result.error.message);
          return;
        }
        router.refresh();
      } catch {
        toast.error(NETWORK_ERROR_MESSAGE);
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        const result = await deleteReminder(reminder.id);
        if (!result.ok) {
          toast.error(result.error.message);
          return;
        }
        toast.success(dict.toasts.reminderDeleted);
        router.refresh();
      } catch {
        toast.error(NETWORK_ERROR_MESSAGE);
      }
    });
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-2xl border border-border px-4 py-4 transition-opacity",
        (isCompleted || isPending) && "opacity-60"
      )}
    >
      <Checkbox
        checked={isCompleted}
        disabled={isPending}
        onCheckedChange={handleToggleComplete}
        className="size-5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        aria-label={dict.reminderList.markComplete(reminder.title)}
      />

      {/* Time leads (priority 1), title follows (priority 2) — weight/size does
          the hierarchy work instead of a colored badge, per "tối giản, ít
          background" — status (priority 3) is the checkbox/strikethrough
          above, recurrence (priority 4) is the smallest, last element. */}
      <Link href={`/app/reminder/${reminder.id}`} className="flex-1 min-w-0 flex items-center gap-3.5">
        <span className="text-sm font-bold tabular-nums text-foreground shrink-0 w-11">
          {reminder.time}
        </span>
        <span
          className={cn(
            "flex-1 min-w-0 text-sm font-medium truncate",
            isCompleted && "line-through text-muted-foreground"
          )}
        >
          {reminder.title}
        </span>
        {reminder.repeat_rule && (
          <Repeat className="size-3.5 text-muted-foreground/70 shrink-0" />
        )}
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-muted shrink-0"
            aria-label={dict.reminderList.options}
          >
            <MoreVertical className="size-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/app/reminder/${reminder.id}`}>
              <Pencil className="size-4" />
              {dict.reminderList.edit}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            <Trash2 className="size-4" />
            {dict.reminderList.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
