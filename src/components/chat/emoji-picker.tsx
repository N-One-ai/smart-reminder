"use client";

import { Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDictionary } from "@/lib/i18n/locale-provider";

/**
 * A curated set of common emojis rather than a full picker library — keeps
 * this at zero added dependencies (see chat architecture review). Covers
 * the everyday range (faces, gestures, hearts, common objects) a reminder/
 * chat app's users would actually reach for; not meant to be exhaustive.
 */
const EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃",
  "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙",
  "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔",
  "🫡", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬",
  "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢",
  "🥵", "🥶", "😵", "🤯", "🤠", "🥳", "😎", "🤓", "🧐", "😕",
  "😟", "🙁", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨",
  "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩",
  "😫", "🥱", "😤", "😡", "😠", "🤬", "👍", "👎", "👏", "🙌",
  "🙏", "🤝", "💪", "✌️", "🤞", "👋", "❤️", "🧡", "💛", "💚",
  "💙", "💜", "🖤", "🤍", "💯", "🔥", "✨", "🎉", "🎂", "☕",
];

export function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const dict = useDictionary();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={dict.chat.emojiPicker}
          className="flex items-center justify-center size-9 rounded-full hover:bg-muted text-muted-foreground shrink-0 min-h-11 min-w-11 sm:min-h-9 sm:min-w-9"
        >
          <Smile className="size-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] sm:w-80" align="start" side="top">
        <div className="grid grid-cols-8 gap-0.5 max-h-56 overflow-y-auto">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onSelect(emoji)}
              className="flex items-center justify-center size-8 rounded-lg hover:bg-muted text-lg"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
