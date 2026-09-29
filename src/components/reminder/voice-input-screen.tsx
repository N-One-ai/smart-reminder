"use client";

import { useState } from "react";
import { ArrowLeft, Keyboard, Mic, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

/**
 * Full-screen voice capture, modeled on the reference mock: a large centered
 * mic orb, a live transcript growing underneath it, and a bottom row to
 * switch back to the keyboard, restart/stop listening, or cancel outright.
 *
 * Deliberately does NOT auto-start listening on mount. Requesting mic access
 * must happen from a genuine click handler — iOS Safari's SpeechRecognition
 * can fail immediately with a permission error if start() is ever called
 * from a useEffect instead of directly inside a tap, since WebKit no longer
 * considers that "user-activated" by the time the effect runs. This also
 * means no permission prompt/error is ever shown before the user actually
 * taps the mic button below.
 */
export function VoiceInputScreen({
  onDone,
  onCancel,
}: {
  onDone: (text: string) => void;
  onCancel: () => void;
}) {
  const [liveText, setLiveText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  const { isListening, start, stop } = useSpeechRecognition({
    onInterim: (transcript) => {
      setErrorMessage(null);
      setLiveText(transcript);
    },
    onResult: (transcript) => {
      onDone(transcript);
    },
    onError: (message) => setErrorMessage(message),
  });

  function handleMicTap() {
    if (isListening) {
      stop();
      return;
    }
    setErrorMessage(null);
    setHasStarted(true);
    start();
  }

  function handleKeyboardTap() {
    stop();
    onDone(liveText);
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          onClick={onCancel}
          aria-label="Quay lại"
          className="flex size-9 items-center justify-center rounded-full hover:bg-muted text-foreground"
        >
          <ArrowLeft className="size-5" />
        </button>
        <p className="font-heading text-base font-bold">Nói để nhập</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-10 px-8">
        {/* Decorative — reflects listening state, the actual mic control lives in the bottom row below. */}
        <div className="relative flex items-center justify-center size-52 shrink-0">
          <span
            className={cn(
              "absolute inset-0 rounded-full border-2 border-primary/40 transition-opacity",
              isListening ? "opacity-100 animate-ping [animation-duration:2.2s]" : "opacity-0"
            )}
          />
          <span
            className={cn(
              "absolute size-40 rounded-full border-2 transition-colors",
              isListening ? "border-primary/50" : "border-border"
            )}
          />
          <span
            className={cn(
              "absolute size-28 rounded-full transition-colors",
              isListening ? "bg-primary/20" : "bg-accent"
            )}
          />
          <Mic className={cn("size-9", isListening ? "text-accent-foreground" : "text-muted-foreground")} />
        </div>

        <div className="min-h-24 max-w-sm text-center">
          {errorMessage ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : (
            <p
              className={cn(
                "text-lg leading-snug text-balance",
                liveText ? "text-foreground font-medium" : "text-muted-foreground"
              )}
            >
              {liveText ||
                (isListening
                  ? "Đang nghe..."
                  : hasStarted
                    ? "Nhấn micro bên dưới để nói lại"
                    : "Nhấn micro bên dưới để bắt đầu nói")}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-10 px-8 pb-10 pt-2">
        <button
          type="button"
          onClick={handleKeyboardTap}
          aria-label="Chuyển sang gõ tay"
          className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground shrink-0"
        >
          <Keyboard className="size-5" />
        </button>

        <button
          type="button"
          onClick={handleMicTap}
          aria-label={isListening ? "Dừng nói" : "Bắt đầu nói"}
          className={cn(
            "flex items-center justify-center size-20 rounded-full shrink-0 transition-transform active:scale-95",
            isListening
              ? "bg-primary text-primary-foreground shadow-xl shadow-primary/40 ring-4 ring-primary/25"
              : "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
          )}
        >
          <Mic className="size-8" />
        </button>

        <button
          type="button"
          onClick={onCancel}
          aria-label="Huỷ"
          className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground shrink-0"
        >
          <X className="size-5" />
        </button>
      </div>
    </div>
  );
}
