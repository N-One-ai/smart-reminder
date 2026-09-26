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

export function ReminderListItem({ occurrence }: { occurrence: ReminderOccurrence }) {
  const router = useRouter();
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
        toast.success("Đã xoá lời nhắc");
        router.refresh();
      } catch {
        toast.error(NETWORK_ERROR_MESSAGE);
      }
    });
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-2xl bg-card shadow-xs px-4 py-3.5 transition-opacity",
        (isCompleted || isPending) && "opacity-60"
      )}
    >
      <Checkbox
        checked={isCompleted}
        disabled={isPending}
        onCheckedChange={handleToggleComplete}
        className="size-5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        aria-label={`Đánh dấu hoàn thành: ${reminder.title}`}
      />

      <Link href={`/app/reminder/${reminder.id}`} className="flex-1 min-w-0 flex items-center gap-3">
        <span className="text-xs font-medium text-accent-foreground bg-accent rounded-full px-2 py-1 shrink-0 tabular-nums">
          {reminder.time}
        </span>
        <span
          className={cn(
            "text-sm font-medium truncate",
            isCompleted && "line-through text-muted-foreground"
          )}
        >
          {reminder.title}
        </span>
        {reminder.repeat_rule && (
          <Repeat className="size-3.5 text-muted-foreground shrink-0" />
        )}
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-muted shrink-0"
            aria-label="Tuỳ chọn"
          >
            <MoreVertical className="size-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/app/reminder/${reminder.id}`}>
              <Pencil className="size-4" />
              Chỉnh sửa
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            <Trash2 className="size-4" />
            Xoá
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
