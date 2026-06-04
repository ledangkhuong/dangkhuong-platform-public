"use client";

import React from "react";
import { Package } from "lucide-react";

interface ProductPerformanceProps {
  products: Array<{
    id: string;
    title: string;
    thumbnail: string | null;
    revenue: number;
    orders: number;
    avgPrice: number;
  }>;
  loading?: boolean;
}

export default function ProductPerformance({
  products,
  loading,
}: ProductPerformanceProps) {
  const topProducts = [...products]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const formatVND = (value: number) =>
    value.toLocaleString("vi-VN") + "đ";

  if (loading) {
    return (
      <div className="card-dark p-5">
        <h3 className="text-white font-semibold mb-4">Hiệu suất sản phẩm</h3>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2a2a2a]">
              <th className="text-xs text-gray-500 font-medium text-left pb-3 w-10">
                #
              </th>
              <th className="text-xs text-gray-500 font-medium text-left pb-3">
                Sản phẩm
              </th>
              <th className="text-xs text-gray-500 font-medium text-right pb-3">
                Doanh thu
              </th>
              <th className="text-xs text-gray-500 font-medium text-right pb-3">
                Đơn hàng
              </th>
              <th className="text-xs text-gray-500 font-medium text-right pb-3">
                Giá TB
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-[#2a2a2a]/50">
                <td className="py-3">
                  <div className="h-4 w-4 bg-[#2a2a2a] rounded animate-pulse" />
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-6 bg-[#2a2a2a] rounded animate-pulse" />
                    <div className="h-4 w-32 bg-[#2a2a2a] rounded animate-pulse" />
                  </div>
                </td>
                <td className="py-3">
                  <div className="h-4 w-20 bg-[#2a2a2a] rounded animate-pulse ml-auto" />
                </td>
                <td className="py-3">
                  <div className="h-4 w-10 bg-[#2a2a2a] rounded animate-pulse ml-auto" />
                </td>
                <td className="py-3">
                  <div className="h-4 w-16 bg-[#2a2a2a] rounded animate-pulse ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (topProducts.length === 0) {
    return (
      <div className="card-dark p-5">
        <h3 className="text-white font-semibold mb-4">Hiệu suất sản phẩm</h3>
        <div className="flex flex-col items-center justify-center py-10 text-gray-500">
          <Package className="w-10 h-10 mb-3 opacity-50" />
          <p className="text-sm">Chưa có dữ liệu sản phẩm</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-dark p-5">
      <h3 className="text-white font-semibold mb-4">Hiệu suất sản phẩm</h3>
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#2a2a2a]">
            <th className="text-xs text-gray-500 font-medium text-left pb-3 w-10">
              #
            </th>
            <th className="text-xs text-gray-500 font-medium text-left pb-3">
              Sản phẩm
            </th>
            <th className="text-xs text-gray-500 font-medium text-right pb-3">
              Doanh thu
            </th>
            <th className="text-xs text-gray-500 font-medium text-right pb-3">
              Đơn hàng
            </th>
            <th className="text-xs text-gray-500 font-medium text-right pb-3">
              Giá TB
            </th>
          </tr>
        </thead>
        <tbody>
          {topProducts.map((product, index) => (
            <tr
              key={product.id}
              className={`text-sm text-gray-300 hover:bg-[#1a1a1a] transition-colors ${
                index % 2 === 1 ? "bg-[#141414]" : ""
              }`}
            >
              <td className="py-3 text-gray-500">{index + 1}</td>
              <td className="py-3">
                <div className="flex items-center gap-3">
                  {product.thumbnail ? (
                    <img
                      src={product.thumbnail}
                      alt={product.title}
                      className="w-6 h-6 rounded object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded bg-[#2a2a2a] flex items-center justify-center">
                      <Package className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                  )}
                  <span className="truncate max-w-[200px]">
                    {product.title}
                  </span>
                </div>
              </td>
              <td className="py-3 text-right text-white font-medium">
                {formatVND(product.revenue)}
              </td>
              <td className="py-3 text-right">{product.orders}</td>
              <td className="py-3 text-right">{formatVND(product.avgPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
