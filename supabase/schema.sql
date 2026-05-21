-- ============================================================
-- LMS Platform — Supabase Database Schema
-- Copy toàn bộ file này vào Supabase → SQL Editor → Run
-- Xem hướng dẫn đầy đủ tại SETUP.md
-- ============================================================

-- ─── EXTENSIONS ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- full-text search

-- ─── PROFILES (mở rộng auth.users) ──────────────────────────
create table public.profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  full_name     text,
  avatar_url    text,
  bio           text,
  phone         text,
  role          text default 'student' check (role in ('student','admin','manager','marketing','sale','support','instructor','editor')),
  tier          text default 'free' check (tier in ('free','member','vip')),
  xp            integer default 0,
  level         integer default 1,
  streak        integer default 0,
  last_login    timestamptz,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Auto-create profile khi user đăng ký
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── PRODUCTS (khoá học / digital products) ──────────────────
create table public.products (
  id            uuid default uuid_generate_v4() primary key,
  slug          text unique not null,
  title         text not null,
  description   text,
  thumbnail     text,
  price         integer default 0, -- VND, 0 = miễn phí
  sale_price    integer,
  type          text default 'course' check (type in ('course','ebook','template','membership')),
  tier_required text default 'free' check (tier_required in ('free','member','vip')),
  status        text default 'draft' check (status in ('draft','published','archived')),
  sort_order    integer default 0,
  created_at    timestamptz default now()
);

-- ─── CHAPTERS ────────────────────────────────────────────────
create table public.chapters (
  id         uuid default uuid_generate_v4() primary key,
  product_id uuid references public.products(id) on delete cascade,
  title      text not null,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- ─── LESSONS ─────────────────────────────────────────────────
create table public.lessons (
  id            uuid default uuid_generate_v4() primary key,
  chapter_id    uuid references public.chapters(id) on delete cascade,
  product_id    uuid references public.products(id) on delete cascade,
  title         text not null,
  description   text,
  youtube_id    text,  -- YouTube video ID (không lưu full URL)
  video_url     text,  -- External video URL (Google Drive, etc). Used when youtube_id is empty.
  duration_sec  integer default 0,
  content       text,  -- markdown nội dung bổ sung
  sort_order    integer default 0,
  is_free       boolean default false, -- bài học preview miễn phí
  created_at    timestamptz default now()
);

-- ─── USER PROGRESS ───────────────────────────────────────────
create table public.lesson_progress (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade,
  lesson_id   uuid references public.lessons(id) on delete cascade,
  product_id  uuid references public.products(id) on delete cascade,
  completed   boolean default false,
  watch_sec   integer default 0, -- số giây đã xem
  note        text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique(user_id, lesson_id)
);

-- ─── ENROLLMENTS (quyền truy cập) ────────────────────────────
create table public.enrollments (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade,
  product_id  uuid references public.products(id) on delete cascade,
  order_id    uuid, -- liên kết đơn hàng
  source      text default 'purchase' check (source in ('purchase','gift','admin','free')),
  expires_at  timestamptz, -- null = vĩnh viễn
  created_at  timestamptz default now(),
  unique(user_id, product_id)
);

-- ─── ORDERS (đơn hàng Sepay) ─────────────────────────────────
create table public.orders (
  id              uuid default uuid_generate_v4() primary key,
  order_code      text unique not null, -- mã giao dịch hiển thị cho khách
  user_id         uuid references public.profiles(id),
  product_id      uuid references public.products(id),
  amount          integer not null, -- VND
  status          text default 'pending' check (status in ('pending','paid','cancelled','refunded')),
  payment_method  text default 'sepay' check (payment_method in ('sepay','bank_transfer')),
  -- Sepay fields
  sepay_txn_id    text,   -- mã giao dịch từ Sepay
  sepay_content   text,   -- nội dung chuyển khoản
  bank_account    text,
  bank_code       text,
  paid_at         timestamptz,
  -- Customer info
  customer_name   text,
  customer_email  text,
  customer_phone  text,
  note            text,
  coupon_code     text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ─── COMMUNITY POSTS ─────────────────────────────────────────
create table public.posts (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade,
  content     text not null,
  image_url   text,
  tags        text[],
  pinned      boolean default false,
  likes_count integer default 0,
  comments_count integer default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─── POST LIKES ──────────────────────────────────────────────
create table public.post_likes (
  user_id    uuid references public.profiles(id) on delete cascade,
  post_id    uuid references public.posts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);

-- ─── COMMENTS ────────────────────────────────────────────────
create table public.comments (
  id          uuid default uuid_generate_v4() primary key,
  post_id     uuid references public.posts(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete cascade,
  content     text not null,
  created_at  timestamptz default now()
);

-- Auto-update comments_count
create or replace function update_post_comments_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update posts set comments_count = comments_count + 1 where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then
    update posts set comments_count = comments_count - 1 where id = OLD.post_id;
  end if;
  return null;
end;
$$;
create trigger on_comment_change
  after insert or delete on public.comments
  for each row execute procedure update_post_comments_count();

-- ─── BLOG POSTS ──────────────────────────────────────────────
create table public.blog_posts (
  id           uuid default uuid_generate_v4() primary key,
  slug         text unique not null,
  title        text not null,
  excerpt      text,
  content      text, -- markdown
  thumbnail    text,
  category     text,
  tags         text[],
  status       text default 'draft' check (status in ('draft','published')),
  views        integer default 0,
  published_at timestamptz,
  created_at   timestamptz default now()
);

-- ─── EMAIL SUBSCRIBERS ───────────────────────────────────────
create table public.subscribers (
  id          uuid default uuid_generate_v4() primary key,
  email       text unique not null,
  full_name   text,
  phone       text,
  source      text, -- landing page slug, utm_source...
  tags        text[],
  status      text default 'active' check (status in ('active','unsubscribed','bounced')),
  user_id     uuid references public.profiles(id),
  created_at  timestamptz default now()
);

-- ─── EMAIL CAMPAIGNS ─────────────────────────────────────────
create table public.email_campaigns (
  id           uuid default uuid_generate_v4() primary key,
  subject      text not null,
  preview_text text,
  body_html    text,
  status       text default 'draft' check (status in ('draft','scheduled','sent')),
  scheduled_at timestamptz,
  sent_at      timestamptz,
  sent_count   integer default 0,
  open_count   integer default 0,
  click_count  integer default 0,
  created_at   timestamptz default now()
);

-- ─── XP EVENTS (gamification) ────────────────────────────────
create table public.xp_events (
  id         uuid default uuid_generate_v4() primary key,
  user_id    uuid references public.profiles(id) on delete cascade,
  action     text not null, -- 'lesson_complete','post_created','comment_added','login',...
  xp_amount  integer not null,
  meta       jsonb, -- extra data
  created_at timestamptz default now()
);

-- Auto-update XP + level on profiles
create or replace function update_user_xp()
returns trigger language plpgsql as $$
declare
  total_xp integer;
  new_level integer;
begin
  select coalesce(sum(xp_amount),0) into total_xp
  from xp_events where user_id = NEW.user_id;

  -- Level formula: mỗi level cần thêm 200 XP
  new_level := greatest(1, floor(total_xp / 200) + 1);

  update profiles set xp = total_xp, level = new_level
  where id = NEW.user_id;
  return NEW;
end;
$$;
create trigger on_xp_event
  after insert on public.xp_events
  for each row execute procedure update_user_xp();

-- ─── ANALYTICS EVENTS ────────────────────────────────────────
create table public.analytics_events (
  id          uuid default uuid_generate_v4() primary key,
  session_id  text,
  user_id     uuid references public.profiles(id),
  event       text not null, -- 'page_view','cta_click','form_submit','purchase',...
  page        text,
  utm_source  text,
  utm_medium  text,
  utm_campaign text,
  meta        jsonb,
  ip          text,
  created_at  timestamptz default now()
);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.enrollments enable row level security;
alter table public.orders enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.xp_events enable row level security;

-- Profiles: user chỉ xem/sửa profile của mình
create policy "users_read_own_profile" on profiles for select using (auth.uid() = id);
create policy "users_update_own_profile" on profiles for update using (auth.uid() = id);
create policy "public_read_profiles" on profiles for select using (true); -- public view

-- Enrollments: user chỉ xem enrollment của mình
create policy "users_read_own_enrollments" on enrollments for select using (auth.uid() = user_id);

-- Orders: user chỉ xem order của mình
create policy "users_read_own_orders" on orders for select using (auth.uid() = user_id);

-- Progress: user chỉ xem/sửa progress của mình
create policy "users_manage_own_progress" on lesson_progress for all using (auth.uid() = user_id);

-- Posts: ai cũng đọc được, chỉ owner mới sửa/xóa
create policy "public_read_posts" on posts for select using (true);
create policy "users_create_posts" on posts for insert with check (auth.uid() = user_id);
create policy "users_manage_own_posts" on posts for update using (auth.uid() = user_id);
create policy "users_delete_own_posts" on posts for delete using (auth.uid() = user_id);

-- Likes
create policy "users_manage_likes" on post_likes for all using (auth.uid() = user_id);
create policy "public_read_likes" on post_likes for select using (true);

-- Comments
create policy "public_read_comments" on comments for select using (true);
create policy "users_create_comments" on comments for insert with check (auth.uid() = user_id);
create policy "users_delete_own_comments" on comments for delete using (auth.uid() = user_id);

-- ─── SEED DATA (sản phẩm mẫu — có thể xóa/sửa) ─────────────
-- Bạn có thể xóa phần này và tạo sản phẩm riêng qua Admin Dashboard
insert into public.products (slug, title, description, price, type, status, sort_order) values
('khoa-hoc-mau-1', 'Khóa Học Mẫu — Bắt Đầu Kinh Doanh Online',
 'Hướng dẫn từng bước xây dựng business online đầu tiên. Phù hợp cho người mới.', 499000, 'course', 'published', 1),
('khoa-hoc-mau-2', 'Marketing Cơ Bản — Xây Dựng Thương Hiệu',
 'Xây dựng thương hiệu cá nhân mạnh mẽ trên internet.', 0, 'course', 'published', 2),
('tai-lieu-mau', 'Tài Liệu Mẫu — Ebook Template',
 'Ebook hướng dẫn chi tiết kèm template sẵn. Download ngay sau khi mua.', 99000, 'ebook', 'published', 3);

-- ─── VIEWS tiện ích ──────────────────────────────────────────
-- Tổng quan CRM
create or replace view public.crm_overview as
select
  count(distinct o.id) filter (where o.status = 'paid') as total_orders,
  coalesce(sum(o.amount) filter (where o.status = 'paid'), 0) as total_revenue,
  count(distinct o.user_id) as total_customers,
  coalesce(avg(o.amount) filter (where o.status = 'paid'), 0) as avg_order_value,
  count(distinct o.id) filter (where o.status = 'pending') as pending_orders
from public.orders o;

-- Doanh thu theo ngày (7 ngày gần nhất)
create or replace view public.daily_revenue as
select
  date_trunc('day', paid_at)::date as day,
  sum(amount) as revenue,
  count(*) as orders
from public.orders
where status = 'paid' and paid_at >= now() - interval '30 days'
group by 1 order by 1;
