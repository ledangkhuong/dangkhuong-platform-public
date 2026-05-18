import type { Metadata } from "next";
import HocChuaXongLanding from "./HocChuaXongLanding";

export const metadata: Metadata = {
  title: "Học Chưa Xong - Tiền Đã Về | Tự Xây Hệ Thống Bán Sản Phẩm Số Bằng AI Agent",
  description:
    "Chương trình duy nhất tại Việt Nam giúp bạn tự xây hệ thống bán sản phẩm số triệu đô bằng AI Agent trong 7-30 ngày. Early Bird 5.000.000đ (giá gốc 20.000.000đ). Tặng 7 bonus 16.379.000đ.",
  alternates: {
    canonical: "https://dangkhuong.com/hocchuaxongtiendave",
  },
  openGraph: {
    title: "Học Chưa Xong - Tiền Đã Về | Tự Xây Hệ Thống Bán Sản Phẩm Số Bằng AI Agent",
    description:
      "Tự xây hệ thống bán Ebook, Khóa học, Template, Phần mềm bằng AI Agent. Sở hữu 100% — không phụ thuộc nền tảng. Early Bird 5.000.000đ (giảm 75%).",
    type: "website",
    url: "https://dangkhuong.com/hocchuaxongtiendave",
    images: [
      {
        url: "https://dangkhuong.com/images/about/portrait.jpg",
        width: 1200,
        height: 630,
        alt: "Học Chưa Xong - Tiền Đã Về — Thầy Lê Đăng Khương",
      },
    ],
  },
};

export default function HocChuaXongPage() {
  return <HocChuaXongLanding />;
}
