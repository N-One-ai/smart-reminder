"use client";

import { useState } from "react";
import { MessageCircleQuestion, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/lib/i18n/locale-provider";

export function ClarificationPrompt({
  question,
  onAnswer,
  onCancel,
}: {
  question: string;
  onAnswer: (answer: string) => void;
  onCancel: () => void;
}) {
  const dict = useDictionary();
  const [answer, setAnswer] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim()) return;
    onAnswer(answer.trim());
    setAnswer("");
  }

  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-1">
      <div className="flex items-start gap-3">
        <div className="flex size-9 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
          <MessageCircleQuestion className="size-4" />
        </div>
        <p className="text-sm font-medium pt-1.5">{question}</p>
      </div>

      <form onSubmit={submit} className="flex items-center gap-2">
        <Input
          autoFocus
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={dict.clarification.answerPlaceholder}
          className="flex-1"
        />
        <Button type="submit" size="icon" aria-label={dict.common.send}>
          <Send className="size-4" />
        </Button>
      </form>

      <button
        type="button"
        onClick={onCancel}
        className="text-xs text-muted-foreground hover:text-foreground self-start"
      >
        {dict.clarification.cancel}
      </button>
    </div>
  );
}
