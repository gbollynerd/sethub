-- ============================================================================
-- SetHub — 0025 FINANCE BATCH
--
-- Adds the three pieces of database plumbing the finance admin-CRUD frontend
-- (dues create/edit/delete, payment reminders, payment confirm/reject +
-- discussion, all already built client-side) depends on but which don't
-- exist yet:
--
--   1. payment_notes — a lightweight, immutable comment thread on a single
--      payment (the "in-app chat about payments" feature). Deliberately NOT
--      built on the existing channels/messages system — it's record-scoped,
--      not a conversation, and this keeps it low-risk.
--   2. send_dues_reminders(p_dues_id, p_membership_ids default null) — the
--      security-definer RPC behind the "Remind" buttons in
--      dues-assignment-row.tsx and send-dues-reminders-button.tsx.
--   3. Two notification producers, following the exact
--      app.notify_user()/app.notify_set_members() pattern established in
--      0024_notification_triggers.sql (each wrapped in its own
--      BEGIN/EXCEPTION so a bug here can never block a real payment or dues
--      assignment from being written):
--        - app.trg_notify_payment_status(): tells the payer when their
--          payment is confirmed or rejected.
--        - app.trg_notify_dues_assigned(): tells a member when a new due is
--          assigned to them.
--
-- app.sync_ledger_from_payment() and app.sync_dues_totals() (0010_finance.sql)
-- already handle all ledger/rollup math on payments/dues_assignments writes —
-- nothing here touches amount_paid, collected_total, etc. directly.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- payment_notes
-- ---------------------------------------------------------------------------
create table if not exists payment_notes (
  id         uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id) on delete cascade,
  author_id  uuid not null references profiles(id) on delete cascade,
  body       text not null check (btrim(body) <> ''),
  created_at timestamptz not null default now()
);
create index if not exists payment_notes_payment_idx on payment_notes (payment_id, created_at);

alter table payment_notes enable row level security;

drop policy if exists payment_notes_select on payment_notes;
create policy payment_notes_select on payment_notes for select to authenticated
  using (
    exists (
      select 1 from payments p
      left join set_memberships m on m.id = p.membership_id
      where p.id = payment_id
        and (m.user_id = auth.uid() or app.has_perm(p.set_id, 'finance.view', p.department_id))
    )
  );

drop policy if exists payment_notes_insert on payment_notes;
create policy payment_notes_insert on payment_notes for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from payments p
      left join set_memberships m on m.id = p.membership_id
      where p.id = payment_id
        and (m.user_id = auth.uid() or app.has_perm(p.set_id, 'finance.view', p.department_id))
    )
  );

-- No update/delete policies — notes are permanent once posted, matching the
-- audit-trail nature of a finance record (mirrors payments/ledger_entries).

-- ---------------------------------------------------------------------------
-- send_dues_reminders — bulk or single-member reminder RPC
-- ---------------------------------------------------------------------------
create or replace function send_dues_reminders(
  p_dues_id uuid,
  p_membership_ids uuid[] default null
) returns int language plpgsql security definer set search_path = public, app, extensions as $$
declare
  v_set_id uuid;
  v_department_id uuid;
  v_title text;
  v_currency text;
  v_count int := 0;
  r record;
begin
  select set_id, department_id, title, currency
    into v_set_id, v_department_id, v_title, v_currency
  from dues where id = p_dues_id;

  if v_set_id is null then
    raise exception 'due not found';
  end if;

  if not app.has_perm(v_set_id, 'finance.dues_manage', v_department_id) then
    raise exception 'you do not have permission to send reminders for this due';
  end if;

  for r in
    select a.id, a.balance, sm.user_id
    from dues_assignments a
    join set_memberships sm on sm.id = a.membership_id
    where a.dues_id = p_dues_id
      and a.status in ('pending', 'partial')
      and a.balance > 0
      and (p_membership_ids is null or a.membership_id = any (p_membership_ids))
  loop
    begin
      perform app.notify_user(
        r.user_id, v_set_id, v_department_id, 'dues.reminder', v_title,
        'A payment of ' || trim(to_char(r.balance, 'FM999,999,999,990.00')) || ' ' ||
          coalesce(v_currency, 'NGN') || ' is still outstanding.',
        '/s/' || v_set_id::text || '/finances/dues/' || p_dues_id::text,
        'bell', 'normal', auth.uid(), 'dues_assignments', r.id, 'dues'
      );
      update dues_assignments
         set last_reminder_at = now(), reminder_count = reminder_count + 1
       where id = r.id;
      v_count := v_count + 1;
    exception when others then
      raise warning 'send_dues_reminders failed for assignment %: %', r.id, sqlerrm;
    end;
  end loop;

  return v_count;
end $$;

grant execute on function send_dues_reminders(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Payments: notify the payer when their payment is confirmed or rejected
-- ---------------------------------------------------------------------------
create or replace function app.trg_notify_payment_status() returns trigger
language plpgsql security definer set search_path = public, app, extensions as $$
declare
  v_user_id uuid;
begin
  begin
    if new.status is distinct from old.status
       and new.status in ('confirmed', 'failed')
       and new.membership_id is not null then

      select user_id into v_user_id from set_memberships where id = new.membership_id;

      if v_user_id is not null then
        if new.status = 'confirmed' then
          perform app.notify_user(
            v_user_id, new.set_id, new.department_id, 'payment.confirmed',
            'Payment confirmed',
            'Your payment of ' || trim(to_char(new.amount, 'FM999,999,999,990.00')) || ' ' ||
              new.currency || ' has been confirmed.',
            '/s/' || new.set_id::text || '/finances/payments/' || new.id::text,
            'wallet', 'normal', new.confirmed_by, 'payments', new.id, 'payments'
          );
        else
          perform app.notify_user(
            v_user_id, new.set_id, new.department_id, 'payment.failed',
            'Payment rejected',
            coalesce(new.rejected_reason, 'Your payment could not be confirmed — see the payment for details.'),
            '/s/' || new.set_id::text || '/finances/payments/' || new.id::text,
            'close', 'high', new.confirmed_by, 'payments', new.id, 'payments'
          );
        end if;
      end if;
    end if;
  exception when others then
    raise warning 'trg_notify_payment_status failed: %', sqlerrm;
  end;
  return null;
end $$;

drop trigger if exists trg_notify_payment_status on payments;
create trigger trg_notify_payment_status after update of status on payments
for each row execute function app.trg_notify_payment_status();

-- ---------------------------------------------------------------------------
-- Dues assignments: notify a member when a new due is assigned to them
-- ---------------------------------------------------------------------------
create or replace function app.trg_notify_dues_assigned() returns trigger
language plpgsql security definer set search_path = public, app, extensions as $$
declare
  v_user_id uuid;
  v_set_id uuid;
  v_department_id uuid;
  v_title text;
  v_currency text;
  v_created_by uuid;
begin
  begin
    select d.set_id, d.department_id, d.title, d.currency, d.created_by
      into v_set_id, v_department_id, v_title, v_currency, v_created_by
    from dues d where d.id = new.dues_id;

    select sm.user_id into v_user_id from set_memberships sm where sm.id = new.membership_id;

    if v_user_id is not null and v_set_id is not null then
      perform app.notify_user(
        v_user_id, v_set_id, v_department_id, 'dues.assigned', v_title,
        'You''ve been assigned ' || trim(to_char(new.amount_due, 'FM999,999,999,990.00')) || ' ' ||
          coalesce(v_currency, 'NGN') ||
          case when new.due_date is not null
            then ' — due ' || to_char(new.due_date, 'DD Mon YYYY')
            else '' end || '.',
        '/s/' || v_set_id::text || '/finances/dues/' || new.dues_id::text,
        'wallet', 'normal', v_created_by, 'dues_assignments', new.id, 'dues'
      );
    end if;
  exception when others then
    raise warning 'trg_notify_dues_assigned failed: %', sqlerrm;
  end;
  return null;
end $$;

drop trigger if exists trg_notify_dues_assigned on dues_assignments;
create trigger trg_notify_dues_assigned after insert on dues_assignments
for each row execute function app.trg_notify_dues_assigned();
