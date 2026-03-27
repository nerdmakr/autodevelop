/** ZELI ProductData 전체 스키마 — 읽기 전용 */

export interface ProductOption {
  name: string;        // "사이즈", "컬러"
  values: string[];    // ["S", "M", "L"]
}

export interface BrandInfo {
  name: string;
  logo_url?: string;
  description?: string;
}

export interface Review {
  rating: number;
  count: number;
  average?: number;
}

export interface ProductData {
  // 기본 정보
  title: string;
  brand: string;
  category: string;
  description: string;

  // 가격
  price: number;
  sale_price?: number;
  discount_rate?: number;
  currency: string;

  // 상태
  status: "available" | "sold_out" | "coming_soon" | "unknown";

  // 미디어
  images: string[];
  detail_images: string[];

  // 옵션
  options: ProductOption[];

  // 브랜드
  brand_info?: BrandInfo;

  // 리뷰
  reviews?: Review;

  // 배송
  shipping_fee?: number;
  shipping_info?: string;

  // 메타
  url: string;
  platform: string;
  tags: string[];
  crawled_at: string;
}

/** 스키마의 모든 필드 키 (커버리지 평가용) */
export const PRODUCT_FIELDS = [
  "title",
  "brand",
  "category",
  "description",
  "price",
  "sale_price",
  "discount_rate",
  "currency",
  "status",
  "images",
  "detail_images",
  "options",
  "brand_info",
  "reviews",
  "shipping_fee",
  "shipping_info",
  "url",
  "platform",
  "tags",
  "crawled_at",
] as const;

/** 필수 필드 (이것 없으면 추출 실패) */
export const REQUIRED_FIELDS = [
  "title",
  "price",
  "url",
  "status",
  "images",
] as const;
