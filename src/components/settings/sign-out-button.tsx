"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { NETWORK_ERROR_MESSAGE } from "@/lib/network-error";
import { TALL_PILL_BUTTON_CLASS } from "@/lib/ui/form-controls";
import { cn } from "@/lib/utils";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await signOut();
      } catch {
        toast.error(NETWORK_ERROR_MESSAGE);
      }
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      disabled={isPending}
      className={cn("w-fit px-6", TALL_PILL_BUTTON_CLASS)}
    >
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
      Đăng xuất
    </Button>
  );
}
