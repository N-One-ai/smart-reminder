export interface Profile {
  id: string;
  name: string;
  email: string;
  timezone: string;
  avatar_url: string | null;
  username: string | null;
  created_at: string;
}

/** The minimal public-safe shape of another user — never includes email. */
export interface PublicProfile {
  id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
}
