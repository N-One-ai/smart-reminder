import Link from "next/link";
import { AuthForm } from "@/components/layout/auth-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col gap-1.5 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Chào mừng trở lại</h1>
          <p className="text-sm text-muted-foreground">
            Đăng nhập để tiếp tục với Smart Reminder
          </p>
        </div>

        <AuthForm mode="login" />

        <p className="text-center text-sm text-muted-foreground">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
