"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Mic, PencilLine, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { AIParseResult } from "@/types/ai";
import type { PublicProfile } from "@/types/profile";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ReminderPreviewCard } from "./reminder-preview-card";
import { ClarificationPrompt } from "./clarification-prompt";
import { ReminderEditForm, type ReminderEditValues } from "./reminder-edit-form";
import { SmartSuggestionList } from "./smart-suggestion-list";
import { VoiceInputScreen } from "./voice-input-screen";
import { ImageScanScreen } from "./image-scan-screen";
import { MentionPicker } from "./mention-picker";
import { parseReminderText, parseReminderImage } from "@/lib/ai/actions";
import { createReminder } from "@/lib/reminder/actions";
import { getMyConnections } from "@/lib/connections/actions";
import { buildAIContext } from "@/lib/utils/date";
import { NETWORK_ERROR_MESSAGE } from "@/lib/network-error";
import { useDictionary } from "@/lib/i18n/locale-provider";

type Mode = "idle" | "parsing" | "clarifying" | "preview" | "editing" | "suggesting";

interface SuggestionContext {
  suggestions: string[];
  date: string;
  time: string;
  timezone: string;
}

export function SmartInput() {
  const router = useRouter();
  const dict = useDictionary();
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
  const [imageOpen, setImageOpen] = useState(false);
  // Set only while the in-flight result came from Scan ảnh — a clarification
  // round-trip must re-send the SAME image (plus the Q&A so far) rather than
  // falling back to text-only parsing and losing everything the image showed.
  const [imageContext, setImageContext] = useState<{ base64: string; mimeType: string } | null>(null);

  // @mention — resolves to a real Connection's profile UUID at SELECTION
  // time (from getMyConnections(), the same accepted-connections read
  // ReminderEditForm's picker uses), never trusted from parsed text or AI
  // output. MVP supports exactly one recipient, so once mentionedUser is
  // set, typing another "@" never reopens the picker (see
  // handleTextareaChange). The database trigger from migration 0009 is
  // still the actual authorization boundary for the resulting
  // shared_with_user_id — this only decides what UUID gets *offered*.
  const [mentionedUser, setMentionedUser] = useState<PublicProfile | null>(null);
  // Exact "@Name" substring inserted into inputText for the current
  // mentionedUser — used both to strip it out before sending text to the AI
  // parser, and to detect the user backspacing over the mention (if the
  // text no longer contains this substring, the mention is cleared).
  const [mentionRaw, setMentionRaw] = useState<string | null>(null);
  // Non-null while the popup is open; its value is whatever's typed after
  // "@" so far, used to filter the connections list.
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionTriggerStart, setMentionTriggerStart] = useState<number | null>(null);
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0);
  const [connections, setConnections] = useState<PublicProfile[] | null>(null);
  const loadingConnections = mentionQuery !== null && connections === null;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filteredConnections = (connections ?? []).filter((c) => {
    if (!mentionQuery) return true;
    const q = mentionQuery.toLowerCase();
    return (c.name ?? "").toLowerCase().includes(q) || (c.username ?? "").toLowerCase().includes(q);
  });

  useEffect(() => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with browser-only SpeechRecognition API, see use-speech-recognition.ts
    setMicSupported(!!Ctor);
  }, []);

  useEffect(() => {
    if (mentionQuery === null || connections !== null) return;
    getMyConnections()
      .then((res) => {
        if (!res.ok) {
          toast.error(res.error.message);
          setConnections([]);
          return;
        }
        setConnections(res.data.map((c) => c.otherUser));
      })
      .catch(() => {
        toast.error(NETWORK_ERROR_MESSAGE);
        setConnections([]);
      });
  }, [mentionQuery, connections]);

  /** Strips the mentioned person's literal "@Name" text out of what gets
   * sent to the AI parser — the title/date/time parse should never see it,
   * since it's not natural-language content, it's a UI selection. */
  function textForParsing(text: string): string {
    if (!mentionRaw) return text;
    return text.replace(mentionRaw, "").replace(/\s{2,}/g, " ").trim();
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setInputText(value);

    let hasMention = mentionedUser !== null;
    if (hasMention && mentionRaw && !value.includes(mentionRaw)) {
      setMentionedUser(null);
      setMentionRaw(null);
      hasMention = false;
    }

    if (hasMention) {
      // Exactly one recipient for the MVP — never reopen the picker once
      // someone is already selected.
      setMentionQuery(null);
      return;
    }

    const cursor = e.target.selectionStart ?? value.length;
    const upToCursor = value.slice(0, cursor);
    const match = /@([^\s@]*)$/.exec(upToCursor);
    if (match) {
      setMentionTriggerStart(cursor - match[0].length);
      setMentionQuery(match[1]);
      setMentionActiveIndex(0);
    } else {
      setMentionQuery(null);
    }
  }

  function handleSelectMention(person: PublicProfile) {
    if (mentionTriggerStart === null) return;
    const cursor = textareaRef.current?.selectionStart ?? inputText.length;
    const before = inputText.slice(0, mentionTriggerStart);
    const after = inputText.slice(cursor);
    const raw = `@${person.name}`;
    const next = `${before}${raw} ${after}`;

    setInputText(next);
    setMentionedUser(person);
    setMentionRaw(raw);
    setMentionQuery(null);
    setMentionTriggerStart(null);

    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      const pos = before.length + raw.length + 1;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  function handleRemoveMention() {
    if (mentionRaw) {
      setInputText(inputText.replace(mentionRaw, "").replace(/\s{2,}/g, " ").trim());
    }
    setMentionedUser(null);
    setMentionRaw(null);
  }

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

  async function runParseImage(base64: string, mimeType: string, additionalContext?: string) {
    setMode("parsing");
    try {
      const context = buildAIContext();
      const res = await parseReminderImage({
        imageBase64: base64,
        mimeType,
        additionalContext,
        currentDate: context.currentDate,
        currentTime: context.currentTime,
        timezone: context.timezone,
        dayOfWeek: context.dayOfWeek,
      });
      if (!res.ok) {
        toast.error(res.error.message);
        setMode("idle");
        setImageContext(null);
        return;
      }
      setImageContext({ base64, mimeType });
      setResult(res.data);
      setMode(res.data.intent === "needs_clarification" ? "clarifying" : "preview");
    } catch {
      toast.error(NETWORK_ERROR_MESSAGE);
      setMode("idle");
      setImageContext(null);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inputText.trim()) return;
    setImageContext(null);
    const stripped = textForParsing(inputText.trim());
    setCombinedText(stripped);
    runParse(stripped);
  }

  function handleClarificationAnswer(answer: string) {
    const merged = `${combinedText} ${answer}`.trim();
    setCombinedText(merged);
    if (imageContext) {
      runParseImage(imageContext.base64, imageContext.mimeType, merged);
    } else {
      runParse(merged);
    }
  }

  function reset() {
    setInputText("");
    setCombinedText("");
    setResult(null);
    setSuggestionContext(null);
    setMode("idle");
    setIsSaving(false);
    setImageContext(null);
    setMentionedUser(null);
    setMentionRaw(null);
    setMentionQuery(null);
    setMentionTriggerStart(null);
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
    shared_with_user_id?: string | null;
  }) {
    setIsSaving(true);
    try {
      const res = await createReminder(input);
      if (!res.ok) {
        toast.error(res.error.message);
        setIsSaving(false);
        return;
      }
      toast.success(dict.toasts.reminderSaved, { description: input.title });
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
      shared_with_user_id: mentionedUser?.id ?? null,
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
      shared_with_user_id: values.sharedWithUserId,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {(mode === "idle" || mode === "parsing") && (
        // Hero surface — the neon-tinted ring/glow is the brand's primary-
        // interaction color, signaling this is THE place to talk to Smart
        // Reminder (text, voice, or a photo), not just another form field.
        <div className="rounded-3xl border border-primary/25 bg-card p-4 shadow-lg shadow-primary/10 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-full bg-accent text-accent-foreground text-xs font-medium"
            >
              <PencilLine className="size-3.5" />
              {dict.smartInput.modeText}
            </button>
            {micSupported && (
              <button
                type="button"
                onClick={() => setVoiceOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-full bg-muted text-muted-foreground text-xs font-medium"
              >
                <Mic className="size-3.5" />
                {dict.smartInput.modeVoice}
              </button>
            )}
            <button
              type="button"
              onClick={() => setImageOpen(true)}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-full bg-muted text-muted-foreground text-xs font-medium"
            >
              <Camera className="size-3.5" />
              {dict.smartInput.modeScan}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="relative">
            <Textarea
              ref={textareaRef}
              value={inputText}
              onChange={handleTextareaChange}
              placeholder={dict.smartInput.placeholder}
              rows={3}
              maxLength={500}
              className="resize-none text-base pr-12 border-none bg-muted focus-visible:ring-2"
              disabled={mode === "parsing"}
              onBlur={() => {
                // Give MentionPicker's onMouseDown a chance to run its
                // selection first — otherwise blur would close the popup
                // before the click/tap is handled.
                window.setTimeout(() => setMentionQuery(null), 100);
              }}
              onKeyDown={(e) => {
                if (mentionQuery !== null) {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    if (filteredConnections.length > 0) {
                      setMentionActiveIndex((i) => (i + 1) % filteredConnections.length);
                    }
                    return;
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    if (filteredConnections.length > 0) {
                      setMentionActiveIndex((i) => (i - 1 + filteredConnections.length) % filteredConnections.length);
                    }
                    return;
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (filteredConnections[mentionActiveIndex]) {
                      handleSelectMention(filteredConnections[mentionActiveIndex]);
                    }
                    return;
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setMentionQuery(null);
                    return;
                  }
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={mode === "parsing" || !inputText.trim()}
              className="absolute right-2 bottom-2"
              aria-label={dict.common.send}
            >
              {mode === "parsing" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
            </Button>

            {mentionQuery !== null && (
              <MentionPicker
                items={filteredConnections}
                loading={loadingConnections}
                activeIndex={mentionActiveIndex}
                onSelect={handleSelectMention}
              />
            )}
          </form>

          {mentionedUser && (
            <div className="flex items-center gap-2 rounded-full border border-input bg-background pl-1 pr-2 py-1 w-fit">
              <span className="text-xs text-muted-foreground pl-1">{dict.reminderForm.shareWith}:</span>
              <span className="text-sm font-medium truncate max-w-32">{mentionedUser.name || "?"}</span>
              <button
                type="button"
                onClick={handleRemoveMention}
                aria-label={dict.reminderForm.removeShare}
                className="flex size-5 items-center justify-center rounded-full hover:bg-muted text-muted-foreground shrink-0"
              >
                ×
              </button>
            </div>
          )}
        </div>
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

      {imageOpen && (
        <ImageScanScreen
          onAnalyze={(base64, mimeType) => {
            setImageOpen(false);
            runParseImage(base64, mimeType);
          }}
          onCancel={() => setImageOpen(false)}
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
          sharedWithUser={mentionedUser}
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
              sharedWithUserId: mentionedUser?.id ?? null,
              sharedWithUser: mentionedUser,
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
