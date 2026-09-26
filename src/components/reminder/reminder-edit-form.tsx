"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { RecurrenceFrequency, RecurrenceRule } from "@/types/reminder";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ReminderEditValues {
  title: string;
  description: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  recurrence: RecurrenceRule | null;
}

const REPEAT_OPTIONS: { value: string; label: string }[] = [
  { value: "none", label: "Không lặp lại" },
  { value: "daily", label: "Mỗi ngày" },
  { value: "weekly", label: "Mỗi tuần" },
  { value: "monthly", label: "Mỗi tháng" },
  { value: "yearly", label: "Mỗi năm" },
];

export function ReminderEditForm({
  initial,
  saving = false,
  onSave,
  onCancel,
}: {
  initial: ReminderEditValues;
  saving?: boolean;
  onSave: (values: ReminderEditValues) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [repeat, setRepeat] = useState<string>(initial.recurrence?.frequency ?? "none");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return; // guard against double-submit racing the disabled state
    if (!title.trim() || !date || !time) return;

    const recurrence: RecurrenceRule | null =
      repeat === "none" ? null : { frequency: repeat as RecurrenceFrequency, interval: 1 };

    onSave({ title: title.trim(), description, date, time, recurrence });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Việc cần làm</Label>
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
          <Label htmlFor="date">Ngày</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="time">Giờ</Label>
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
        <Label htmlFor="repeat">Lặp lại</Label>
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
        <Label htmlFor="description">Ghi chú</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ghi chú tuỳ chọn..."
          rows={3}
          maxLength={2000}
        />
      </div>

      <div className="flex items-center gap-2 mt-1">
        <Button type="submit" disabled={saving} className="flex-1">
          {saving && <Loader2 className="size-4 animate-spin" />}
          Lưu
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving} className="flex-1">
          Huỷ
        </Button>
      </div>
    </form>
  );
}
