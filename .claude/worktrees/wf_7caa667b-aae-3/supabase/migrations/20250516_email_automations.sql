-- =====================================================
-- Email Marketing Pro: Tags, Automations, Flow Builder
-- =====================================================

-- ─── Email Tags ─────────────────────────────────────
-- Centralized tag definitions with metadata
create table if not exists email_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text default '#6b7280',
  description text,
  subscriber_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Email Automations (Workflows) ─────────────────
create table if not exists email_automations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text default 'draft' check (status in ('draft','active','paused','archived')),
  trigger_type text not null default 'manual',
  -- trigger_type: 'tag_added', 'subscribed_to_list', 'manual', 'purchase', 'form_submit'
  trigger_config jsonb default '{}',
  -- Flow definition: { nodes: [...], edges: [...] }
  flow_definition jsonb default '{"nodes":[],"edges":[]}',
  -- Aggregated stats
  enrolled_count int default 0,
  completed_count int default 0,
  active_count int default 0,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Automation Steps (denormalized from flow for processing) ──
create table if not exists email_automation_steps (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references email_automations(id) on delete cascade,
  step_order int not null default 0,
  step_type text not null,
  -- step_type: 'send_email', 'wait', 'condition', 'add_tag', 'remove_tag', 'move_to_list', 'webhook'
  config jsonb default '{}',
  -- For send_email: { subject, template_id, html_content }
  -- For wait: { days, hours, minutes }
  -- For condition: { field, operator, value, yes_step_id, no_step_id }
  -- For add_tag/remove_tag: { tag_name }
  -- For move_to_list: { list_id }
  next_step_id uuid,
  yes_step_id uuid, -- for condition nodes
  no_step_id uuid,  -- for condition nodes
  created_at timestamptz default now()
);

-- ─── Automation Enrollments (subscriber journeys) ──
create table if not exists email_automation_enrollments (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references email_automations(id) on delete cascade,
  subscriber_id uuid not null references subscribers(id) on delete cascade,
  current_step_id uuid references email_automation_steps(id),
  status text default 'active' check (status in ('active','completed','paused','exited','waiting')),
  enrolled_at timestamptz default now(),
  completed_at timestamptz,
  next_action_at timestamptz,
  step_data jsonb default '{}',
  created_at timestamptz default now(),
  unique(automation_id, subscriber_id)
);

-- ─── Automation Logs ────────────────────────────────
create table if not exists email_automation_logs (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid references email_automation_enrollments(id) on delete cascade,
  automation_id uuid not null references email_automations(id) on delete cascade,
  subscriber_id uuid not null references subscribers(id) on delete cascade,
  step_id uuid,
  action text not null,
  -- action: 'enrolled', 'email_sent', 'email_opened', 'email_clicked',
  --         'tag_added', 'tag_removed', 'condition_yes', 'condition_no',
  --         'wait_started', 'wait_completed', 'completed', 'exited'
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- ─── Indexes ────────────────────────────────────────
create index if not exists idx_automation_enrollments_automation
  on email_automation_enrollments(automation_id);
create index if not exists idx_automation_enrollments_subscriber
  on email_automation_enrollments(subscriber_id);
create index if not exists idx_automation_enrollments_next_action
  on email_automation_enrollments(next_action_at) where status = 'waiting';
create index if not exists idx_automation_logs_automation
  on email_automation_logs(automation_id);
create index if not exists idx_automation_logs_enrollment
  on email_automation_logs(enrollment_id);
create index if not exists idx_automation_steps_automation
  on email_automation_steps(automation_id);
create index if not exists idx_subscribers_tags
  on subscribers using gin(tags);

-- ─── RLS Policies ───────────────────────────────────
alter table email_tags enable row level security;
alter table email_automations enable row level security;
alter table email_automation_steps enable row level security;
alter table email_automation_enrollments enable row level security;
alter table email_automation_logs enable row level security;

-- Admin/manager can do everything
create policy "admin_all_email_tags" on email_tags
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager'))
  );

create policy "admin_all_email_automations" on email_automations
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager'))
  );

create policy "admin_all_email_automation_steps" on email_automation_steps
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager'))
  );

create policy "admin_all_email_automation_enrollments" on email_automation_enrollments
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager'))
  );

create policy "admin_all_email_automation_logs" on email_automation_logs
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager'))
  );

-- ─── Function to update tag subscriber counts ──────
create or replace function update_tag_subscriber_counts()
returns void as $$
begin
  update email_tags t
  set subscriber_count = (
    select count(*)
    from subscribers s
    where s.status = 'active'
      and s.tags @> array[t.name]
  ),
  updated_at = now();
end;
$$ language plpgsql;
