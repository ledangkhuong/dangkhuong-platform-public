-- ============================================================================
-- WEEK 1 MIGRATION :: 12) SEED DATA (Vietnam addresses + categories + products)
-- ============================================================================

-- ---- VN address samples: HN, HCM, DN + 13 wards total ----
INSERT INTO public.vn_provinces (code, name, name_en, code_name, division_type, phone_code) VALUES
    ('01', 'Thanh pho Ha Noi',      'Ha Noi City',        'ha_noi',      'thanh pho trung uong', 24),
    ('79', 'Thanh pho Ho Chi Minh', 'Ho Chi Minh City',   'ho_chi_minh', 'thanh pho trung uong', 28),
    ('48', 'Thanh pho Da Nang',     'Da Nang City',       'da_nang',     'thanh pho trung uong', 236)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.vn_wards (code, name, name_en, code_name, division_type, province_code) VALUES
    ('00001', 'Phuong Phuc Xa',          'Phuc Xa Ward',          'phuong_phuc_xa',          'phuong', '01'),
    ('00004', 'Phuong Truc Bach',        'Truc Bach Ward',        'phuong_truc_bach',        'phuong', '01'),
    ('00006', 'Phuong Vinh Phuc',        'Vinh Phuc Ward',        'phuong_vinh_phuc',        'phuong', '01'),
    ('00007', 'Phuong Cong Vi',          'Cong Vi Ward',          'phuong_cong_vi',          'phuong', '01'),
    ('00008', 'Phuong Lieu Giai',        'Lieu Giai Ward',        'phuong_lieu_giai',        'phuong', '01'),
    ('26734', 'Phuong Ben Nghe',         'Ben Nghe Ward',         'phuong_ben_nghe',         'phuong', '79'),
    ('26737', 'Phuong Ben Thanh',        'Ben Thanh Ward',        'phuong_ben_thanh',        'phuong', '79'),
    ('26740', 'Phuong Nguyen Thai Binh', 'Nguyen Thai Binh Ward', 'phuong_nguyen_thai_binh', 'phuong', '79'),
    ('26743', 'Phuong Pham Ngu Lao',     'Pham Ngu Lao Ward',     'phuong_pham_ngu_lao',     'phuong', '79'),
    ('26746', 'Phuong Cau Ong Lanh',     'Cau Ong Lanh Ward',     'phuong_cau_ong_lanh',     'phuong', '79'),
    ('20194', 'Phuong Thanh Binh',       'Thanh Binh Ward',       'phuong_thanh_binh',       'phuong', '48'),
    ('20195', 'Phuong Thuan Phuoc',      'Thuan Phuoc Ward',      'phuong_thuan_phuoc',      'phuong', '48'),
    ('20197', 'Phuong Thach Thang',      'Thach Thang Ward',      'phuong_thach_thang',      'phuong', '48')
ON CONFLICT (code) DO NOTHING;

-- ---- Product categories (root + children) ----
INSERT INTO public.product_categories (id, slug, name, description, parent_id, position, is_visible) VALUES
    ('11111111-1111-1111-1111-111111110001', 'sach',                'Sach',                'Sach in giay va ebook',                NULL, 1, true),
    ('11111111-1111-1111-1111-111111110002', 'merch',               'Merchandise',         'San pham luu niem, qua tang',          NULL, 2, true),
    ('11111111-1111-1111-1111-111111110011', 'sach-phat-trien-ban-than', 'Sach phat trien ban than', 'Self-help, tu duy', '11111111-1111-1111-1111-111111110001', 1, true),
    ('11111111-1111-1111-1111-111111110012', 'sach-kinh-doanh',     'Sach kinh doanh',     'Khoi nghiep, marketing, lanh dao',     '11111111-1111-1111-1111-111111110001', 2, true),
    ('11111111-1111-1111-1111-111111110021', 'ao-thun',             'Ao thun',             'Ao thun in logo',                       '11111111-1111-1111-1111-111111110002', 1, true),
    ('11111111-1111-1111-1111-111111110022', 'so-tay',              'So tay',              'So tay, planner',                       '11111111-1111-1111-1111-111111110002', 2, true)
ON CONFLICT (slug) DO NOTHING;

-- ---- 5 books + 5 merch products ----
INSERT INTO public.products (
    id, slug, name, short_description, sku, price, compare_at_price, cost,
    product_type, status, thumbnail_url, weight_grams, dimensions_cm, tags, category_id, published_at
) VALUES
    -- BOOKS (5)
    ('22222222-2222-2222-2222-000000000001', 'tu-duy-nguoc-dong',
     'Tu duy nguoc dong', 'Cuon sach ve tu duy phan bien va chu dong',
     'BOOK-TDNG-001', 189000, 240000, 95000,
     'book', 'active', 'https://cdn.example.com/books/tu-duy-nguoc-dong.jpg',
     350, '{"length": 20.5, "width": 14.5, "height": 2.0}'::jsonb,
     ARRAY['tu-duy','self-help','best-seller'],
     '11111111-1111-1111-1111-111111110011', now()),

    ('22222222-2222-2222-2222-000000000002', 'thoi-quen-nguyen-tu',
     'Thoi quen nguyen tu', 'Phuong phap xay dung thoi quen tot moi ngay',
     'BOOK-TQNT-002', 219000, 280000, 110000,
     'book', 'active', 'https://cdn.example.com/books/thoi-quen-nguyen-tu.jpg',
     420, '{"length": 20.5, "width": 14.5, "height": 2.5}'::jsonb,
     ARRAY['thoi-quen','self-help'],
     '11111111-1111-1111-1111-111111110011', now()),

    ('22222222-2222-2222-2222-000000000003', 'khoi-nghiep-tinh-gon',
     'Khoi nghiep tinh gon', 'Lean Startup phien ban Viet Nam',
     'BOOK-KNTG-003', 259000, 320000, 130000,
     'book', 'active', 'https://cdn.example.com/books/khoi-nghiep-tinh-gon.jpg',
     480, '{"length": 21.0, "width": 14.8, "height": 3.0}'::jsonb,
     ARRAY['khoi-nghiep','kinh-doanh','lean'],
     '11111111-1111-1111-1111-111111110012', now()),

    ('22222222-2222-2222-2222-000000000004', 'marketing-3-0',
     'Marketing 3.0', 'Tu san pham den khach hang den tinh than',
     'BOOK-MK30-004', 195000, 250000, 100000,
     'book', 'active', 'https://cdn.example.com/books/marketing-30.jpg',
     400, '{"length": 20.5, "width": 14.5, "height": 2.3}'::jsonb,
     ARRAY['marketing','kinh-doanh'],
     '11111111-1111-1111-1111-111111110012', now()),

    ('22222222-2222-2222-2222-000000000005', 'lanh-dao-don-gian',
     'Lanh dao don gian', 'Nguyen tac lanh dao thuc dung cho manager moi',
     'BOOK-LDDG-005', 229000, 290000, 115000,
     'book', 'active', 'https://cdn.example.com/books/lanh-dao-don-gian.jpg',
     440, '{"length": 20.5, "width": 14.5, "height": 2.6}'::jsonb,
     ARRAY['lanh-dao','quan-tri','kinh-doanh'],
     '11111111-1111-1111-1111-111111110012', now()),

    -- MERCH (5)
    ('22222222-2222-2222-2222-000000000101', 'ao-thun-logo-classic',
     'Ao thun logo classic', 'Ao thun cotton 100%, in logo thuong hieu',
     'MERCH-TS-CL-101', 290000, 350000, 120000,
     'merch', 'active', 'https://cdn.example.com/merch/ao-thun-classic.jpg',
     220, '{"length": 30, "width": 25, "height": 2}'::jsonb,
     ARRAY['ao-thun','merch','classic'],
     '11111111-1111-1111-1111-111111110021', now()),

    ('22222222-2222-2222-2222-000000000102', 'ao-thun-mua-he',
     'Ao thun mua he', 'Ao thun mong mat, phu hop mua nong',
     'MERCH-TS-SM-102', 270000, 320000, 110000,
     'merch', 'active', 'https://cdn.example.com/merch/ao-thun-mua-he.jpg',
     200, '{"length": 30, "width": 25, "height": 2}'::jsonb,
     ARRAY['ao-thun','merch','summer'],
     '11111111-1111-1111-1111-111111110021', now()),

    ('22222222-2222-2222-2222-000000000103', 'so-tay-planner-2026',
     'So tay Planner 2026', 'Planner 365 ngay, bia cung, giay kraft',
     'MERCH-NB-PL26-103', 320000, 400000, 140000,
     'merch', 'active', 'https://cdn.example.com/merch/planner-2026.jpg',
     520, '{"length": 21, "width": 15, "height": 2.5}'::jsonb,
     ARRAY['so-tay','planner','2026'],
     '11111111-1111-1111-1111-111111110022', now()),

    ('22222222-2222-2222-2222-000000000104', 'so-tay-notes-A5',
     'So tay Notes A5', 'So ke dong A5, 200 trang giay 80gsm',
     'MERCH-NB-A5-104', 150000, 190000, 60000,
     'merch', 'active', 'https://cdn.example.com/merch/notes-a5.jpg',
     280, '{"length": 21, "width": 14.8, "height": 1.5}'::jsonb,
     ARRAY['so-tay','notes','a5'],
     '11111111-1111-1111-1111-111111110022', now()),

    ('22222222-2222-2222-2222-000000000105', 'tui-tote-canvas',
     'Tui tote canvas', 'Tui vai canvas in logo, ben va tien dung',
     'MERCH-BAG-TT-105', 180000, 220000, 75000,
     'merch', 'active', 'https://cdn.example.com/merch/tui-tote.jpg',
     180, '{"length": 38, "width": 35, "height": 1}'::jsonb,
     ARRAY['tui','tote','canvas'],
     '11111111-1111-1111-1111-111111110002', now())
ON CONFLICT (slug) DO NOTHING;

-- ---- Variants (default variant for each product + size/color variants for merch) ----
INSERT INTO public.product_variants (
    id, product_id, name, sku, price, stock_count, weight_grams, position, attributes, is_default
) VALUES
    -- Books: 1 default variant per book
    ('33333333-3333-3333-3333-000000000001', '22222222-2222-2222-2222-000000000001', 'Bia mem', 'BOOK-TDNG-001-PB', 189000, 50, 350, 0, '{"format": "paperback"}'::jsonb, true),
    ('33333333-3333-3333-3333-000000000002', '22222222-2222-2222-2222-000000000002', 'Bia mem', 'BOOK-TQNT-002-PB', 219000, 60, 420, 0, '{"format": "paperback"}'::jsonb, true),
    ('33333333-3333-3333-3333-000000000003', '22222222-2222-2222-2222-000000000003', 'Bia mem', 'BOOK-KNTG-003-PB', 259000, 40, 480, 0, '{"format": "paperback"}'::jsonb, true),
    ('33333333-3333-3333-3333-000000000004', '22222222-2222-2222-2222-000000000004', 'Bia mem', 'BOOK-MK30-004-PB',  195000, 45, 400, 0, '{"format": "paperback"}'::jsonb, true),
    ('33333333-3333-3333-3333-000000000005', '22222222-2222-2222-2222-000000000005', 'Bia mem', 'BOOK-LDDG-005-PB', 229000, 35, 440, 0, '{"format": "paperback"}'::jsonb, true),

    -- Ao thun classic: 3 sizes
    ('33333333-3333-3333-3333-000000000101', '22222222-2222-2222-2222-000000000101', 'Size M / Den', 'MERCH-TS-CL-101-M-BK', 290000, 30, 220, 0, '{"size":"M","color":"black"}'::jsonb, true),
    ('33333333-3333-3333-3333-000000000102', '22222222-2222-2222-2222-000000000101', 'Size L / Den', 'MERCH-TS-CL-101-L-BK', 290000, 25, 240, 1, '{"size":"L","color":"black"}'::jsonb, false),
    ('33333333-3333-3333-3333-000000000103', '22222222-2222-2222-2222-000000000101', 'Size XL / Den', 'MERCH-TS-CL-101-XL-BK', 290000, 15, 260, 2, '{"size":"XL","color":"black"}'::jsonb, false),

    -- Ao thun mua he: 2 colors
    ('33333333-3333-3333-3333-000000000111', '22222222-2222-2222-2222-000000000102', 'Trang Size M', 'MERCH-TS-SM-102-M-WH', 270000, 20, 200, 0, '{"size":"M","color":"white"}'::jsonb, true),
    ('33333333-3333-3333-3333-000000000112', '22222222-2222-2222-2222-000000000102', 'Xanh Size M',  'MERCH-TS-SM-102-M-BL', 270000, 18, 200, 1, '{"size":"M","color":"blue"}'::jsonb, false),

    -- Planner 2026: 1 default
    ('33333333-3333-3333-3333-000000000121', '22222222-2222-2222-2222-000000000103', 'Bia kraft', 'MERCH-NB-PL26-103-K', 320000, 40, 520, 0, '{"cover":"kraft"}'::jsonb, true),

    -- Notes A5: 2 colors
    ('33333333-3333-3333-3333-000000000131', '22222222-2222-2222-2222-000000000104', 'Den', 'MERCH-NB-A5-104-BK', 150000, 60, 280, 0, '{"color":"black"}'::jsonb, true),
    ('33333333-3333-3333-3333-000000000132', '22222222-2222-2222-2222-000000000104', 'Nau', 'MERCH-NB-A5-104-BR', 150000, 50, 280, 1, '{"color":"brown"}'::jsonb, false),

    -- Tote bag: 1 default
    ('33333333-3333-3333-3333-000000000141', '22222222-2222-2222-2222-000000000105', 'Trang tu nhien', 'MERCH-BAG-TT-105-NT', 180000, 80, 180, 0, '{"color":"natural"}'::jsonb, true)
ON CONFLICT (sku) DO NOTHING;

-- ============================================================================
-- END OF WEEK 1 MIGRATION :: e-commerce foundation
-- ============================================================================
