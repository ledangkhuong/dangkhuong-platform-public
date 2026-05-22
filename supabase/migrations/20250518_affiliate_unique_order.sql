-- Prevent duplicate affiliate conversions from webhook retries
ALTER TABLE affiliate_conversions ADD CONSTRAINT affiliate_conversions_order_id_unique UNIQUE (order_id);
