"use client";

import { useEffect, useState } from "react";
import { Loader2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import type { RecurrenceFrequency, RecurrenceRule } from "@/types/reminder";
import type { PublicProfile } from "@/types/profile";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getMyConnections } from "@/lib/connections/actions";
import { NETWORK_ERROR_MESSAGE } from "@/lib/network-error";
import { useDictionary } from "@/lib/i18n/locale-provider";

export interface ReminderEditValues {
  title: string;
  description: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  recurrence: RecurrenceRule | null;
  sharedWithUserId: string | null;
}

export function ReminderEditForm({
  initial,
  saving = false,
  onSave,
  onCancel,
}: {
  initial: ReminderEditValues & { sharedWithUser?: PublicProfile | null };
  saving?: boolean;
  onSave: (values: ReminderEditValues) => void;
  onCancel: () => void;
}) {
  const dict = useDictionary();
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [repeat, setRepeat] = useState<string>(initial.recurrence?.frequency ?? "none");
  const [sharedWith, setSharedWith] = useState<PublicProfile | null>(initial.sharedWithUser ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [connections, setConnections] = useState<PublicProfile[] | null>(null);
  const loadingConnections = pickerOpen && connections === null;

  useEffect(() => {
    if (!pickerOpen || connections !== null) return;
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
  }, [pickerOpen, connections]);

  const REPEAT_OPTIONS: { value: string; label: string }[] = [
    { value: "none", label: dict.recurrence.none },
    { value: "daily", label: dict.recurrence.daily },
    { value: "weekly", label: dict.recurrence.weekly },
    { value: "monthly", label: dict.recurrence.monthly },
    { value: "yearly", label: dict.recurrence.yearly },
  ];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return; // guard against double-submit racing the disabled state
    if (!title.trim() || !date || !time) return;

    const recurrence: RecurrenceRule | null =
      repeat === "none" ? null : { frequency: repeat as RecurrenceFrequency, interval: 1 };

    onSave({
      title: title.trim(),
      description,
      date,
      time,
      recurrence,
      sharedWithUserId: sharedWith?.id ?? null,
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">{dict.reminderForm.title}</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date">{dict.reminderForm.date}</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="time">{dict.reminderForm.time}</Label>
          <Input
            id="time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="repeat">{dict.reminderForm.repeat}</Label>
        <Select value={repeat} onValueChange={setRepeat}>
          <SelectTrigger id="repeat" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REPEAT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>{dict.reminderForm.shareWith}</Label>
        {sharedWith ? (
          <div className="flex items-center gap-2 rounded-full border border-input pl-1 pr-2 py-1 w-fit">
            <Avatar size="sm">
              {sharedWith.avatar_url && <AvatarImage src={sharedWith.avatar_url} alt={sharedWith.name} />}
              <AvatarFallback>{(sharedWith.name || sharedWith.username || "?").charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium truncate max-w-32">{sharedWith.name || "?"}</span>
            {sharedWith.username && (
              <span className="text-xs text-muted-foreground truncate">@{sharedWith.username}</span>
            )}
            <button
              type="button"
              onClick={() => setSharedWith(null)}
              aria-label={dict.reminderForm.removeShare}
              className="flex size-5 items-center justify-center rounded-full hover:bg-muted text-muted-foreground shrink-0"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPickerOpen(true)}
            className="w-fit"
          >
            <UserPlus className="size-3.5" />
            {dict.reminderForm.chooseSomeone}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">{dict.reminderForm.description}</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={dict.reminderForm.descriptionPlaceholder}
          rows={3}
          maxLength={2000}
        />
      </div>

      <div className="flex items-center gap-2 mt-1">
        <Button type="submit" disabled={saving} className="flex-1">
          {saving && <Loader2 className="size-4 animate-spin" />}
          {dict.reminderForm.save}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving} className="flex-1">
          {dict.reminderForm.cancel}
        </Button>
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>{dict.reminderForm.shareWith}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1 max-h-72 overflow-y-auto -mx-1 px-1">
            {loadingConnections ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : connections && connections.length > 0 ? (
              connections.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => {
                    setSharedWith(person);
                    setPickerOpen(false);
                  }}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted text-left"
                >
                  <Avatar size="default">
                    {person.avatar_url && <AvatarImage src={person.avatar_url} alt={person.name} />}
                    <AvatarFallback>{(person.name || person.username || "?").charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <span className="text-sm font-semibold truncate">{person.name || "?"}</span>
                    {person.username && (
                      <span className="text-xs text-muted-foreground truncate">@{person.username}</span>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                {dict.reminderForm.noConnectionsToShare}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}
