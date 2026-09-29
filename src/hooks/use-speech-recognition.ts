"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Wraps the Web Speech API's SpeechRecognition (Chrome/Edge; vendor-prefixed
 * as webkitSpeechRecognition). Firefox and older Safari have no
 * implementation — isSupported is feature-detected so callers can hide the
 * mic entirely rather than show a control that silently does nothing.
 * Vietnamese ("vi-VN") only — this app's input is Vietnamese throughout.
 */
export function useSpeechRecognition({
  onResult,
  onError,
  onInterim,
}: {
  onResult: (transcript: string) => void;
  onError: (message: string) => void;
  /** Live, not-yet-final transcript — only fires when the caller wants a
   * word-by-word preview (e.g. the dedicated voice screen); omit to only
   * ever get the finished transcript via onResult. */
  onInterim?: (transcript: string) => void;
}) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with browser-only SpeechRecognition API, see comment above
    setIsSupported(!!Ctor);
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  function start() {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor || isListening) return;

    const recognition = new Ctor();
    recognition.lang = "vi-VN";
    recognition.continuous = false;
    recognition.interimResults = !!onInterim;
    recognition.maxAlternatives = 1;

    recognition.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) finalText += transcript;
        else interimText += transcript;
      }
      if (finalText) onResult(finalText);
      else if (interimText) onInterim?.(interimText);
    };

    recognition.onerror = (e) => {
      if (e.error === "no-speech") {
        onError("Không nghe thấy gì. Hãy thử nói lại.");
      } else if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        onError("Bạn cần cấp quyền micro để dùng tính năng này.");
      } else {
        onError("Không nhận diện được giọng nói. Vui lòng thử lại.");
      }
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  function stop() {
    recognitionRef.current?.stop();
  }

  return { isSupported, isListening, start, stop };
}
