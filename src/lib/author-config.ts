// Default author configuration for blog posts
// This can be overridden per-post when author columns are added to blog_posts table

export interface AuthorInfo {
  name: string;
  avatar: string;
  bio: string;
  facebook: string;
}

export const DEFAULT_AUTHOR: AuthorInfo = {
  name: "Đăng Khương",
  avatar: "", // Set to URL when avatar image is uploaded (e.g. "/images/author-avatar.jpg")
  bio: "Chuyên gia Marketing & Thương Hiệu Cá Nhân. Người sáng lập Đăng Khương Academy — nền tảng đào tạo kinh doanh sản phẩm số, xây dựng hệ thống bán hàng tự động bằng AI Agent.",
  facebook: "https://www.facebook.com/dangkhuong.official",
};
