"use client";

import { useEffect, useRef, useState } from "react";
import { useDictionary } from "@/lib/i18n/locale-provider";

export type MicPermissionState = "unknown" | "granted" | "denied";

/**
 * Wraps the Web Speech API's SpeechRecognition (Chrome/Edge; vendor-prefixed
 * as webkitSpeechRecognition — Safari 17+ also supports it, unprefixed).
 * isSupported is feature-detected so callers can hide the mic entirely
 * rather than show a control that silently does nothing.
 * Vietnamese ("vi-VN") only — this app's input is Vietnamese throughout.
 *
 * Permission handling: start() always requests `getUserMedia({ audio: true })`
 * FIRST, synchronously at the top of the call (no `await` before it), and only
 * calls `recognition.start()` once that resolves. Two reasons:
 *  1. iOS Safari's SpeechRecognition does not reliably show its own
 *     permission prompt — calling recognition.start() without an explicit,
 *     already-granted getUserMedia permission can fail immediately with
 *     "not-allowed", with the user never having seen a real prompt at all.
 *  2. The permission dialog itself only appears when getUserMedia is invoked
 *     from inside a genuine user-gesture call stack (a click handler) — never
 *     from a useEffect/auto-start, which WebKit does not treat as "activated".
 *     Callers MUST only invoke start() from a click handler, never on mount.
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
  const dict = useDictionary();
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [permissionState, setPermissionState] = useState<MicPermissionState>("unknown");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    const supported = !!Ctor && !!navigator.mediaDevices?.getUserMedia;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with browser-only SpeechRecognition/mediaDevices API, see comment above
    setIsSupported(supported);

    // Best-effort, read-only: the Permissions API lets Chrome/Edge report an
    // already-decided "denied" state without ever prompting. Safari doesn't
    // support querying the "microphone" permission name and throws — that's
    // fine, permissionState just stays "unknown" until the user taps mic.
    navigator.permissions
      ?.query({ name: "microphone" as PermissionName })
      .then((status) => {
        if (status.state === "denied") setPermissionState("denied");
        else if (status.state === "granted") setPermissionState("granted");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  function startRecognition() {
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
        onError(dict.errors.micNoSpeech);
      } else if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setPermissionState("denied");
        onError(dict.errors.micPermissionDenied);
      } else {
        onError(dict.errors.micUnknown);
      }
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  /**
   * Must be called directly from a click handler (never from useEffect) — see
   * the permission-handling note above. Requests mic access explicitly before
   * ever touching SpeechRecognition, and maps every failure to a specific,
   * user-facing Vietnamese message rather than one generic error.
   */
  async function start() {
    if (isListening) return;

    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor || !navigator.mediaDevices?.getUserMedia) {
      onError(dict.errors.micUnsupported);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Only needed getUserMedia to obtain/confirm the permission grant —
      // SpeechRecognition captures audio internally, so release this stream
      // immediately rather than holding the mic open twice.
      stream.getTracks().forEach((track) => track.stop());
      setPermissionState("granted");
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setPermissionState("denied");
        onError(dict.errors.micPermissionDenied);
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        onError(dict.errors.micNoDevice);
      } else {
        onError(dict.errors.micUnknown);
      }
      return;
    }

    startRecognition();
  }

  function stop() {
    recognitionRef.current?.stop();
  }

  return { isSupported, isListening, permissionState, start, stop };
}
