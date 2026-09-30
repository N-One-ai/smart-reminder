import Link from "next/link";
import { AuthForm } from "@/components/layout/auth-form";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function RegisterPage() {
  const dict = getDictionary(await getLocale());

  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col gap-1.5 text-center">
          <h1 className="text-xl font-semibold tracking-tight">{dict.auth.createAccount}</h1>
          <p className="text-sm text-muted-foreground">
            {dict.auth.registerSubtitle}
          </p>
        </div>

        <AuthForm mode="register" />

        <p className="text-center text-sm text-muted-foreground">
          {dict.auth.haveAccount}{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            {dict.auth.login}
          </Link>
        </p>
      </div>
    </div>
  );
}
