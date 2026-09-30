"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LogOut, Settings } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth/actions";
import { NETWORK_ERROR_MESSAGE } from "@/lib/network-error";
import { useDictionary } from "@/lib/i18n/locale-provider";

export function UserMenu({
  name,
  email,
  avatarUrl = null,
  avatarSize = "default",
}: {
  name: string;
  email: string;
  avatarUrl?: string | null;
  avatarSize?: "default" | "lg";
}) {
  const router = useRouter();
  const dict = useDictionary();
  const [, startTransition] = useTransition();
  const initial = (name || "?").charAt(0).toUpperCase();

  function handleSignOut() {
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={dict.userMenu.accountMenu(name)}
          className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar size={avatarSize}>
            {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
            <AvatarFallback className="font-medium">{initial}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="font-medium">{name}</span>
          <span className="text-xs font-normal text-muted-foreground">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="size-4" />
            {dict.nav.settings}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="size-4" />
          {dict.settings.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
