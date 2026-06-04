-- Add category column to products table for course categorization
-- Categories: video, branding, business, personal_development
ALTER TABLE products ADD COLUMN IF NOT EXISTS category text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN products.category IS 'Course category: video, branding, business, personal_development';
