-- Image attachments for 1-to-1 chat (Phase 2). Smallest possible schema
-- change: extends the existing `messages` row with nullable attachment
-- columns rather than a separate attachments table — a message is still
-- exactly one row, now optionally carrying image metadata alongside (or
-- instead of) its text content.
--
-- Deliberately NOT adding any Storage RLS policy for the new `chat-images`
-- bucket (see Part 3/5 of the plan, and the security notes at the bottom
-- of this file) — every access path to that bucket goes through a Server
-- Action using the service-role client, after that action has already
-- re-verified conversation membership through the existing `messages`/
-- `conversation_members` RLS. Browsers never touch Storage for this bucket
-- directly, so there is nothing for a Storage RLS policy to additionally
-- restrict; adding one would be a second, parallel authorization system
-- with no browser code path that could ever exercise it.
--
-- Every statement is safe to run more than once (idempotent), same
-- convention as 0005/0006/0007. This file does not modify any of them.

-- ------------------------------------------------------------------ --
-- messages — allow content to be absent when an image is attached      --
-- ------------------------------------------------------------------ --
-- Current constraint (from 0006) requires content to be present and
-- non-blank on every row. An image-only message (no caption) needs
-- content to be allowed to be NULL instead.
alter table public.messages alter column content drop not null;

alter table public.messages drop constraint if exists messages_content_not_blank;
alter table public.messages add constraint messages_content_not_blank
  check (content is null or char_length(btrim(content)) > 0);

-- messages_content_max_length (char_length(content) <= 2000) already
-- tolerates NULL unchanged — a CHECK constraint is satisfied whenever its
-- expression evaluates to NULL rather than false, so no change needed there.

-- ------------------------------------------------------------------ --
-- messages — attachment columns                                       --
-- ------------------------------------------------------------------ --
alter table public.messages add column if not exists attachment_type text;
alter table public.messages add column if not exists attachment_path text;
alter table public.messages add column if not exists attachment_mime_type text;
alter table public.messages add column if not exists attachment_size integer;

-- Only 'image' for this phase — deliberately not a generic attachment
-- system yet (see Part 7 of the plan).
alter table public.messages drop constraint if exists messages_attachment_type_valid;
alter table public.messages add constraint messages_attachment_type_valid
  check (attachment_type is null or attachment_type = 'image');

alter table public.messages drop constraint if exists messages_attachment_mime_valid;
alter table public.messages add constraint messages_attachment_mime_valid
  check (attachment_mime_type is null or attachment_mime_type in ('image/jpeg', 'image/png', 'image/webp'));

-- 10 MB, matching the MVP limit from the plan.
alter table public.messages drop constraint if exists messages_attachment_size_valid;
alter table public.messages add constraint messages_attachment_size_valid
  check (attachment_size is null or (attachment_size > 0 and attachment_size <= 10485760));

-- The 4 attachment columns are either all present or all absent — never a
-- half-filled row (e.g. a path with no mime type).
alter table public.messages drop constraint if exists messages_attachment_coherent;
alter table public.messages add constraint messages_attachment_coherent
  check (
    (attachment_type is null and attachment_path is null and attachment_mime_type is null and attachment_size is null)
    or (attachment_type is not null and attachment_path is not null and attachment_mime_type is not null and attachment_size is not null)
  );

-- A message must carry text, an image, or both — never neither.
alter table public.messages drop constraint if exists messages_has_content_or_attachment;
alter table public.messages add constraint messages_has_content_or_attachment
  check (content is not null or attachment_path is not null);

-- ------------------------------------------------------------------ --
-- chat-images bucket — private, no public flag                        --
-- ------------------------------------------------------------------ --
-- No Storage RLS policy is added for this bucket (see header comment).
-- storage.objects already has row level security enabled project-wide
-- (required for the existing `avatars` bucket's policies in 0004 to have
-- any effect at all) — with zero policies matching `bucket_id =
-- 'chat-images'`, RLS's default-deny means the `authenticated` and `anon`
-- roles get NO access to any row in this bucket through the client
-- libraries, for any operation. Only the service-role client (server-side
-- only, see actions.ts) can read or write it, by bypassing RLS entirely as
-- service-role always does.
insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', false)
on conflict (id) do nothing;
