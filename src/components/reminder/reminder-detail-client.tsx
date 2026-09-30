"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, Pencil, Repeat, Trash2, CheckCircle2, ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ReminderEditForm, type ReminderEditValues } from "@/components/reminder/reminder-edit-form";
import { ReminderQuickEdit } from "@/components/reminder/reminder-quick-edit";
import { completeOccurrence, deleteReminder, updateReminder } from "@/lib/reminder/actions";
import { formatFullDate, todayKey } from "@/lib/utils/date";
import { NETWORK_ERROR_MESSAGE } from "@/lib/network-error";
import type { ValidatedAIEditResult } from "@/lib/ai/validate";
import { useDictionary } from "@/lib/i18n/locale-provider";
import type { Reminder } from "@/types/reminder";

export function ReminderDetailClient({ reminder }: { reminder: Reminder }) {
  const router = useRouter();
  const dict = useDictionary();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [quickEditing, setQuickEditing] = useState(false);

  const today = todayKey();
  const isCompleted = reminder.repeat_rule
    ? reminder.last_completed_date === today
    : reminder.status === "completed";

  function handleSave(values: ReminderEditValues) {
    startTransition(async () => {
      try {
        const result = await updateReminder(reminder.id, {
          title: values.title,
          description: values.description,
          date: values.date,
          time: values.time,
          timezone: reminder.timezone,
          recurrence: values.recurrence,
        });
        if (!result.ok) {
          toast.error(result.error.message);
          return;
        }
        toast.success(dict.toasts.changesSaved);
        setEditing(false);
        router.refresh();
      } catch {
        toast.error(NETWORK_ERROR_MESSAGE);
      }
    });
  }

  function handleQuickEditApply(values: {
    title: string;
    date: string;
    time: string;
    recurrence: ValidatedAIEditResult["recurrence"];
  }) {
    startTransition(async () => {
      try {
        const result = await updateReminder(reminder.id, {
          title: values.title,
          description: reminder.description,
          date: values.date,
          time: values.time,
          timezone: reminder.timezone,
          recurrence: values.recurrence,
        });
        if (!result.ok) {
          toast.error(result.error.message);
          return;
        }
        toast.success(dict.toasts.changesSaved);
        setQuickEditing(false);
        router.refresh();
      } catch {
        toast.error(NETWORK_ERROR_MESSAGE);
      }
    });
  }

  function handleComplete() {
    startTransition(async () => {
      try {
        const result = await completeOccurrence(reminder.id, reminder.repeat_rule ? today : reminder.date);
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
        router.push("/app");
        router.refresh();
      } catch {
        toast.error(NETWORK_ERROR_MESSAGE);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit"
      >
        <ArrowLeft className="size-4" />
        {dict.reminderDetail.back}
      </button>

      {editing ? (
        <div className="rounded-xl border bg-card p-5">
          <ReminderEditForm
            initial={{
              title: reminder.title,
              description: reminder.description,
              date: reminder.date,
              time: reminder.time,
              recurrence: reminder.repeat_rule,
            }}
            saving={isPending}
            onSave={handleSave}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : quickEditing ? (
        <ReminderQuickEdit
          reminder={reminder}
          onApply={handleQuickEditApply}
          onClose={() => setQuickEditing(false)}
          saving={isPending}
        />
      ) : (
        <div className="rounded-xl border bg-card p-5 flex flex-col gap-5">
          <h1
            className={`font-heading text-lg font-bold ${isCompleted ? "line-through text-muted-foreground" : ""}`}
          >
            {reminder.title}
          </h1>

          <div className="flex flex-col gap-3 text-sm">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Calendar className="size-4" />
              {formatFullDate(reminder.date)}
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Clock className="size-4" />
              {reminder.time}
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {dict.reminderDetail.repeat}
            </p>
            <p className="text-sm flex items-center gap-1.5">
              {reminder.repeat_rule ? (
                <>
                  <Repeat className="size-3.5" />
                  {dict.recurrence[reminder.repeat_rule.frequency]}
                </>
              ) : (
                dict.common.none
              )}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {dict.reminderDetail.note}
            </p>
            <p className="text-sm text-muted-foreground">{reminder.description || "—"}</p>
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setQuickEditing(true)}
              disabled={isPending}
              className="flex-1"
            >
              <Sparkles className="size-4" />
              {dict.reminderDetail.quickEdit}
            </Button>
            <Button
              variant="outline"
              onClick={() => setEditing(true)}
              disabled={isPending}
              className="flex-1"
            >
              <Pencil className="size-4" />
              {dict.reminderDetail.edit}
            </Button>
            <Button
              variant={isCompleted ? "outline" : "default"}
              onClick={handleComplete}
              disabled={isPending}
              className="flex-1"
            >
              <CheckCircle2 className="size-4" />
              {isCompleted ? dict.reminderDetail.markUndone : dict.reminderDetail.markDone}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isPending}
                  className="flex-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                  {dict.reminderDetail.delete}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{dict.reminderDetail.deleteConfirmTitle}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {reminder.repeat_rule
                      ? dict.reminderDetail.deleteConfirmRecurring
                      : dict.reminderDetail.deleteConfirmOnce}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{dict.common.cancel}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>{dict.reminderDetail.delete}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  );
}
