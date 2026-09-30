"use client";

import { useState } from "react";
import { Loader2, Sparkles, Calendar, Clock, Repeat, X } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { parseReminderEdit } from "@/lib/ai/actions";
import type { ValidatedAIEditResult } from "@/lib/ai/validate";
import { buildAIContext, formatDayLabel } from "@/lib/utils/date";
import { NETWORK_ERROR_MESSAGE } from "@/lib/network-error";
import { useDictionary } from "@/lib/i18n/locale-provider";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Reminder } from "@/types/reminder";

// Below this, the model itself said it couldn't tell what should change —
// force an explicit confirm instead of silently applying a guess.
const LOW_CONFIDENCE_THRESHOLD = 0.4;

type Mode = "input" | "parsing" | "preview";

function recurrenceLabel(dict: Dictionary, r: Reminder["repeat_rule"]): string {
  return r ? dict.recurrence[r.frequency] : dict.common.none;
}

function recurrenceEqual(a: Reminder["repeat_rule"], b: ValidatedAIEditResult["recurrence"]): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    a.frequency === b.frequency &&
    a.interval === b.interval &&
    JSON.stringify(a.days ?? []) === JSON.stringify(b.days ?? []) &&
    (a.day_of_month ?? null) === (b.day_of_month ?? null)
  );
}

function DiffField({
  icon,
  label,
  before,
  after,
  changed,
}: {
  icon: React.ReactNode;
  label: string;
  before: string;
  after: string;
  changed: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-xs text-muted-foreground">{label}</span>
        {changed ? (
          <span className="flex items-center gap-1.5 flex-wrap">
            <span className="text-muted-foreground line-through">{before}</span>
            <span className="font-medium text-accent-foreground">{after}</span>
          </span>
        ) : (
          <span>{after}</span>
        )}
      </div>
    </div>
  );
}

export function ReminderQuickEdit({
  reminder,
  onApply,
  onClose,
  saving,
}: {
  reminder: Reminder;
  onApply: (values: {
    title: string;
    date: string;
    time: string;
    recurrence: ValidatedAIEditResult["recurrence"];
  }) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const dict = useDictionary();
  const [text, setText] = useState("");
  const [mode, setMode] = useState<Mode>("input");
  const [result, setResult] = useState<ValidatedAIEditResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || mode === "parsing") return;
    setMode("parsing");
    try {
      const context = buildAIContext();
      const res = await parseReminderEdit({
        currentTitle: reminder.title,
        currentDate: reminder.date,
        currentTime: reminder.time,
        currentRecurrence: reminder.repeat_rule,
        editText: text.trim(),
        timezone: context.timezone,
        today: context.currentDate,
        nowTime: context.currentTime,
        dayOfWeek: context.dayOfWeek,
      });
      if (!res.ok) {
        toast.error(res.error.message);
        setMode("input");
        return;
      }
      setResult(res.data);
      setMode("preview");
    } catch {
      toast.error(NETWORK_ERROR_MESSAGE);
      setMode("input");
    }
  }

  if (mode === "preview" && result) {
    const titleChanged = result.title !== reminder.title;
    const dateChanged = result.date !== reminder.date;
    const timeChanged = result.time !== reminder.time;
    const recurrenceChanged = !recurrenceEqual(reminder.repeat_rule, result.recurrence);
    const noChange = !titleChanged && !dateChanged && !timeChanged && !recurrenceChanged;
    const lowConfidence = result.confidence < LOW_CONFIDENCE_THRESHOLD;

    return (
      <div className="rounded-xl border bg-card p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-1">
        <div className="flex flex-col gap-2.5">
          <DiffField
            icon={<Sparkles className="size-3.5" />}
            label={dict.quickEdit.fieldTitle}
            before={reminder.title}
            after={result.title}
            changed={titleChanged}
          />
          <DiffField
            icon={<Calendar className="size-3.5" />}
            label={dict.quickEdit.fieldDate}
            before={formatDayLabel(dict, reminder.date)}
            after={formatDayLabel(dict, result.date)}
            changed={dateChanged}
          />
          <DiffField
            icon={<Clock className="size-3.5" />}
            label={dict.quickEdit.fieldTime}
            before={reminder.time}
            after={result.time}
            changed={timeChanged}
          />
          <DiffField
            icon={<Repeat className="size-3.5" />}
            label={dict.quickEdit.fieldRepeat}
            before={recurrenceLabel(dict, reminder.repeat_rule)}
            after={recurrenceLabel(dict, result.recurrence)}
            changed={recurrenceChanged}
          />
        </div>

        {(noChange || lowConfidence) && (
          <p className="text-xs text-amber-600 dark:text-amber-500">
            {noChange ? dict.quickEdit.noChange : dict.quickEdit.lowConfidence}
          </p>
        )}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() =>
              onApply({
                title: result.title,
                date: result.date,
                time: result.time,
                recurrence: result.recurrence,
              })
            }
            disabled={saving || noChange}
            className="flex-1"
          >
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            {dict.quickEdit.confirm}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setResult(null);
              setText("");
              setMode("input");
            }}
            disabled={saving}
            className="flex-1"
          >
            {dict.quickEdit.editAgain}
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose} disabled={saving} aria-label={dict.quickEdit.close}>
            <X className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-4 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {dict.quickEdit.heading}
        </p>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onClose}
          className="size-6 -mt-1 -mr-1"
          aria-label={dict.quickEdit.close}
        >
          <X className="size-3.5" />
        </Button>
      </div>
      <div className="relative">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={dict.quickEdit.placeholder}
          rows={2}
          maxLength={500}
          autoFocus
          className="resize-none text-sm pr-11"
          disabled={mode === "parsing"}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <Button
          type="submit"
          size="icon"
          disabled={mode === "parsing" || !text.trim()}
          className="absolute right-1.5 bottom-1.5 size-8"
          aria-label={dict.quickEdit.send}
        >
          {mode === "parsing" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
        </Button>
      </div>
    </form>
  );
}
