import { CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** No plan/subscription system exists in the database yet — deliberately
 * not fabricating Free/Pro member counts. See lib/admin/queries.ts. */
export function SubscriptionStatusCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="size-4" />
          Subscription
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Subscription plans are not configured yet.</p>
      </CardContent>
    </Card>
  );
}
