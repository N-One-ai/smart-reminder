"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { createReminder } from "@/lib/reminder/actions";
import { NETWORK_ERROR_MESSAGE } from "@/lib/network-error";
import { useDictionary } from "@/lib/i18n/locale-provider";

/**
 * Checklist of AI-suggested related tasks (spec §12) — shown after the main
 * reminder is confirmed. Each suggestion inherits the primary reminder's
 * date/time/timezone (simplest sensible default; user can edit afterwards
 * from the normal reminder detail flow, per Rule 5 — no over-engineering a
 * per-suggestion time picker for the MVP).
 */
export function SmartSuggestionList({
  suggestions,
  date,
  time,
  timezone,
  onDismiss,
}: {
  suggestions: string[];
  date: string;
  time: string;
  timezone: string;
  onDismiss: () => void;
}) {
  const router = useRouter();
  const dict = useDictionary();
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState<Set<number>>(new Set());
  const [addingAll, setAddingAll] = useState(false);

  async function addOne(index: number) {
    if (added.has(index) || pending.has(index)) return;
    setPending((prev) => new Set(prev).add(index));

    try {
      const result = await createReminder({
        title: suggestions[index],
        description: "",
        date,
        time,
        timezone,
        recurrence: null,
        source: "ai",
        ai_confidence: null,
      });

      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      setAdded((prev) => new Set(prev).add(index));
      router.refresh();
    } catch {
      toast.error(NETWORK_ERROR_MESSAGE);
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  }

  async function addAll() {
    setAddingAll(true);
    const remaining = suggestions
      .map((_, i) => i)
      .filter((i) => !added.has(i) && !pending.has(i));
    await Promise.all(remaining.map(addOne));
    setAddingAll(false);
  }

  const allAdded = added.size === suggestions.length;

  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-1">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-accent-foreground" />
        <p className="text-sm font-medium">{dict.suggestions.heading}</p>
      </div>

      <div className="flex flex-col gap-2">
        {suggestions.map((title, i) => (
          <label
            key={i}
            className="flex items-center gap-2.5 text-sm cursor-pointer select-none"
          >
            <Checkbox
              checked={added.has(i)}
              disabled={pending.has(i) || added.has(i)}
              onCheckedChange={() => addOne(i)}
            />
            <span className={added.has(i) ? "text-muted-foreground line-through" : ""}>
              {title}
            </span>
            {added.has(i) && <Check className="size-3.5 text-accent-foreground" />}
          </label>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={addAll}
          disabled={allAdded || addingAll}
          className="flex-1"
        >
          {allAdded ? dict.suggestions.allAdded : dict.suggestions.addAll}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss} className="flex-1">
          {dict.suggestions.dismiss}
        </Button>
      </div>
    </div>
  );
}
