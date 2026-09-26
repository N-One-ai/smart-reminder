import Link from "next/link";
import { AuthForm } from "@/components/layout/auth-form";

export default function RegisterPage() {
  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col gap-1.5 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Tạo tài khoản</h1>
          <p className="text-sm text-muted-foreground">
            Bắt đầu để Smart Reminder nhớ giúp bạn
          </p>
        </div>

        <AuthForm mode="register" />

        <p className="text-center text-sm text-muted-foreground">
          Đã có tài khoản?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
