-- ============================================================================
-- SetHub — 0019 FIXES applied after the first live smoke test
--
-- Three real bugs, all caught by running the full member journey against the
-- live database (create set -> mirror departments -> invite -> redeem -> join
-- department -> post -> assign dues -> pay -> approve expense):
--
--   1. `case when ... then 'active' else 'pending' end` yields TEXT, and the
--      target column is the `membership_status` enum. Postgres will not cast
--      implicitly in an INSERT, so join_department, join_set and redeem_invite
--      all failed. Fixed by casting the CASE expression.
--   2. pgcrypto is installed in the `extensions` schema on Supabase. Any
--      SECURITY DEFINER function that pins `search_path` must include it, or
--      gen_random_bytes() is not found at runtime.
--   3. redeem_invite created the membership without granting the baseline
--      `member` role, so a freshly invited member had an empty permission set.
--
-- 0015 already carries the corrected definitions; this file exists so an
-- existing database can be brought forward without a full replay.
-- ============================================================================

alter function create_invite(uuid,invite_scope,uuid,uuid,uuid,text,text,int,int,boolean,uuid)
  set search_path = public, app, extensions;
alter function redeem_invite(text,jsonb)      set search_path = public, app, extensions;
alter function cast_election_ballot(uuid,jsonb) set search_path = public, app, extensions;
alter function approve_school_recommendation(uuid) set search_path = public, app, extensions;
