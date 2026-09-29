import Link from "next/link";
import { AuthForm } from "@/components/layout/auth-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 px-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG logo; next/image blocks local SVGs without extra dangerouslyAllowSVG config, not worth it for one icon */}
      <img src="/logo-rymi.svg" alt="Rymi" className="w-1/4 h-auto" />

      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col gap-1.5 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Chào mừng trở lại</h1>
          <p className="text-sm text-muted-foreground">
            Đăng nhập để tiếp tục với Rymi
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
