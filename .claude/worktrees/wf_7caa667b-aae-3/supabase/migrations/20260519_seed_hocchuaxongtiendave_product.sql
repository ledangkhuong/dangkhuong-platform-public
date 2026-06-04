-- Seed product for landing page /hocchuaxongtiendave
-- Học Chưa Xong - Tiền Đã Về | Early Bird 5.000.000đ (giá gốc 20.000.000đ)

insert into public.products (slug, title, description, price, sale_price, type, tier_required, status, sort_order)
values (
  'hoc-chua-xong-tien-da-ve',
  'Học Chưa Xong - Tiền Đã Về',
  'Tự xây hệ thống bán SẢN PHẨM SỐ triệu đô bằng AI Agent trong 7 ngày. 50 bài học · 4 module · 6 bonus trị giá 16.479.000đ. Early Bird ưu đãi 75% — chỉ 5.000.000đ.',
  20000000,
  5000000,
  'course',
  'member',
  'published',
  10
)
on conflict (slug) do update set
  title       = excluded.title,
  description = excluded.description,
  price       = excluded.price,
  sale_price  = excluded.sale_price,
  status      = excluded.status;
