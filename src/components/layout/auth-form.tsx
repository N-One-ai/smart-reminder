"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp } from "@/lib/auth/actions";
import { NETWORK_ERROR_MESSAGE } from "@/lib/network-error";
import { cn } from "@/lib/utils";
import { TALL_INPUT_CLASS, TALL_PILL_BUTTON_CLASS } from "@/lib/ui/form-controls";

interface AuthFormProps {
  mode: "login" | "register";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const result = await signIn({ email, password });
        if (!result.ok) {
          setError(result.error.message);
          return;
        }
        router.push("/app");
        router.refresh();
      } else {
        const result = await signUp({ name, email, password });
        if (!result.ok) {
          setError(result.error.message);
          return;
        }
        if (result.data.needsEmailConfirmation) {
          setNeedsConfirmation(true);
        } else {
          router.push("/app");
          router.refresh();
        }
      }
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  if (needsConfirmation) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-6 text-center">
        <MailCheck className="size-8 text-accent-foreground" />
        <p className="text-sm font-medium">Kiểm tra email của bạn</p>
        <p className="text-xs text-muted-foreground">
          Chúng tôi đã gửi một liên kết xác nhận tới {email}. Xác nhận để hoàn tất đăng ký.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {mode === "register" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Họ và tên</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nguyễn Văn A"
            required
            className={TALL_INPUT_CLASS}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className={TALL_INPUT_CLASS}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Mật khẩu</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "register" ? "Tối thiểu 6 ký tự" : "••••••••"}
          minLength={6}
          required
          className={TALL_INPUT_CLASS}
        />
      </div>

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
      )}

      <Button type="submit" disabled={loading} className={cn("mt-2", TALL_PILL_BUTTON_CLASS)}>
        {loading && <Loader2 className="size-4 animate-spin" />}
        {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
      </Button>
    </form>
  );
}
