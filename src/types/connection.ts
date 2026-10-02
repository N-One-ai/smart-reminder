import type { ConnectionStatus } from "./database";
import type { PublicProfile } from "./profile";

export type { ConnectionStatus };

/** A connection row joined with the other party's public-safe profile. */
export interface ConnectionWithProfile {
  id: string;
  status: ConnectionStatus;
  /** Whether the current user sent this request (vs. received it). */
  isRequester: boolean;
  createdAt: string;
  updatedAt: string;
  otherUser: PublicProfile;
}

export interface UserSearchResult extends PublicProfile {
  /** Current relationship between the searching user and this result, if any. */
  connectionStatus: ConnectionStatus | null;
  /** When connectionStatus is "pending", whether the searching user is the one who sent it. */
  isRequester: boolean | null;
  /** The connections row id, when connectionStatus is non-null — needed to accept/reject/remove. */
  connectionId: string | null;
}
