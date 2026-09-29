"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mic, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { AIParseResult } from "@/types/ai";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ReminderPreviewCard } from "./reminder-preview-card";
import { ClarificationPrompt } from "./clarification-prompt";
import { ReminderEditForm, type ReminderEditValues } from "./reminder-edit-form";
import { SmartSuggestionList } from "./smart-suggestion-list";
import { VoiceInputScreen } from "./voice-input-screen";
import { parseReminderText } from "@/lib/ai/actions";
import { createReminder } from "@/lib/reminder/actions";
import { buildAIContext } from "@/lib/utils/date";
import { NETWORK_ERROR_MESSAGE } from "@/lib/network-error";

type Mode = "idle" | "parsing" | "clarifying" | "preview" | "editing" | "suggesting";

interface SuggestionContext {
  suggestions: string[];
  date: string;
  time: string;
  timezone: string;
}

export function SmartInput() {
  const router = useRouter();
  const [inputText, setInputText] = useState("");
  const [combinedText, setCombinedText] = useState("");
  const [mode, setMode] = useState<Mode>("idle");
  const [result, setResult] = useState<AIParseResult | null>(null);
  const [suggestionContext, setSuggestionContext] = useState<SuggestionContext | null>(null);
  // Separate from `mode` so the Preview/Edit card stays mounted (and visibly
  // disabled) for the whole save instead of unmounting mid-request — an
  // unmounted "saving" state let users navigate away with zero feedback that
  // a save was still in flight.
  const [isSaving, setIsSaving] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);

  useEffect(() => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with browser-only SpeechRecognition API, see use-speech-recognition.ts
    setMicSupported(!!Ctor);
  }, []);

  async function runParse(text: string) {
    setMode("parsing");
    try {
      const context = buildAIContext();
      const res = await parseReminderText({ text, ...context });
      if (!res.ok) {
        toast.error(res.error.message);
        setMode("idle");
        return;
      }
      setResult(res.data);
      setMode(res.data.intent === "needs_clarification" ? "clarifying" : "preview");
    } catch {
      toast.error(NETWORK_ERROR_MESSAGE);
      setMode("idle");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inputText.trim()) return;
    setCombinedText(inputText.trim());
    runParse(inputText.trim());
  }

  function handleClarificationAnswer(answer: string) {
    const merged = `${combinedText} ${answer}`;
    setCombinedText(merged);
    runParse(merged);
  }

  function reset() {
    setInputText("");
    setCombinedText("");
    setResult(null);
    setSuggestionContext(null);
    setMode("idle");
    setIsSaving(false);
  }

  async function persist(input: {
    title: string;
    description: string;
    date: string;
    time: string;
    timezone: string;
    recurrence: AIParseResult["recurrence"];
    source: "ai" | "manual";
    ai_confidence: number | null;
    suggestions?: string[];
  }) {
    setIsSaving(true);
    try {
      const res = await createReminder(input);
      if (!res.ok) {
        toast.error(res.error.message);
        setIsSaving(false);
        return;
      }
      toast.success("Đã lưu lời nhắc", { description: input.title });
      router.refresh();

      if (input.suggestions && input.suggestions.length > 0) {
        setSuggestionContext({
          suggestions: input.suggestions,
          date: input.date,
          time: input.time,
          timezone: input.timezone,
        });
        setInputText("");
        setCombinedText("");
        setResult(null);
        setMode("suggesting");
        setIsSaving(false);
      } else {
        reset();
      }
    } catch {
      toast.error(NETWORK_ERROR_MESSAGE);
      setIsSaving(false);
    }
  }

  function handleConfirm() {
    if (isSaving) return; // guard against double-click racing the disabled state
    if (!result || !result.date || !result.time || !result.title) return;
    persist({
      title: result.title,
      description: result.description,
      date: result.date,
      time: result.time,
      timezone: result.timezone,
      recurrence: result.recurrence,
      source: "ai",
      ai_confidence: result.confidence,
      suggestions: result.suggestions,
    });
  }

  function handleEditSave(values: ReminderEditValues) {
    persist({
      title: values.title,
      description: values.description,
      date: values.date,
      time: values.time,
      timezone: "Asia/Ho_Chi_Minh",
      recurrence: values.recurrence,
      source: "manual",
      ai_confidence: null,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {(mode === "idle" || mode === "parsing") && (
        <form onSubmit={handleSubmit} className="relative">
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Bạn cần nhớ điều gì?"
            rows={2}
            maxLength={500}
            className={micSupported ? "resize-none text-base pr-20" : "resize-none text-base pr-12"}
            disabled={mode === "parsing"}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          {micSupported && (
            <Button
              type="button"
              size="icon"
              variant="outline"
              disabled={mode === "parsing"}
              onClick={() => setVoiceOpen(true)}
              className="absolute right-12 bottom-2"
              aria-label="Nói để nhập"
            >
              <Mic className="size-4" />
            </Button>
          )}
          <Button
            type="submit"
            size="icon"
            disabled={mode === "parsing" || !inputText.trim()}
            className="absolute right-2 bottom-2"
            aria-label="Gửi"
          >
            {mode === "parsing" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
          </Button>
        </form>
      )}

      {voiceOpen && (
        <VoiceInputScreen
          onDone={(text) => {
            setInputText(text);
            setVoiceOpen(false);
          }}
          onCancel={() => setVoiceOpen(false)}
        />
      )}

      {mode === "clarifying" && result?.clarification_question && (
        <ClarificationPrompt
          question={result.clarification_question}
          onAnswer={handleClarificationAnswer}
          onCancel={reset}
        />
      )}

      {mode === "preview" && result && (
        <ReminderPreviewCard
          result={result}
          saving={isSaving}
          onConfirm={handleConfirm}
          onEdit={() => setMode("editing")}
        />
      )}

      {mode === "editing" && result && (
        <div className="rounded-xl border bg-card p-4">
          <ReminderEditForm
            initial={{
              title: result.title ?? "",
              description: result.description,
              date: result.date ?? "",
              time: result.time ?? "",
              recurrence: result.recurrence,
            }}
            saving={isSaving}
            onSave={handleEditSave}
            onCancel={() => setMode("preview")}
          />
        </div>
      )}

      {mode === "suggesting" && suggestionContext && (
        <SmartSuggestionList
          suggestions={suggestionContext.suggestions}
          date={suggestionContext.date}
          time={suggestionContext.time}
          timezone={suggestionContext.timezone}
          onDismiss={reset}
        />
      )}
    </div>
  );
}
