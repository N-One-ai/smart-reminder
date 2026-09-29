import Link from "next/link";
import { Bell, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col items-center px-4">
      <div className="w-full max-w-lg flex flex-col items-center gap-8 py-20 sm:py-28 text-center">
        <div className="flex items-center gap-2 font-heading text-sm font-semibold text-muted-foreground">
          <Bell className="size-4" />
          Smart Reminder
        </div>

        <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-balance">
          Đừng cố nhớ mọi thứ.
        </h1>

        <p className="text-muted-foreground text-balance">
          Smart Reminder giúp bạn biến những câu nói tự nhiên thành lời nhắc thông minh.
        </p>

        {/* Input demo */}
        <div className="w-full flex flex-col gap-3">
          <div className="w-full rounded-xl border bg-card px-4 py-3 text-left text-sm text-muted-foreground">
            &ldquo;Mai lúc 8h nhớ gọi cho Minh.&rdquo;
          </div>

          <div className="w-full rounded-xl border bg-card px-4 py-3.5 text-left flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
                <Bell className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Gọi cho Minh</p>
                <p className="text-xs text-muted-foreground">📅 Ngày mai · 08:00</p>
              </div>
            </div>
          </div>
        </div>

        <Button asChild size="lg" className="mt-2">
          <Link href="/register">
            Bắt đầu miễn phí
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
