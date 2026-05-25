// Tiện ích phân tích chuỗi User-Agent thuần (không phụ thuộc thư viện ngoài).
// Trích xuất loại thiết bị, hệ điều hành, trình duyệt và phát hiện bot
// bằng regex để dùng trong analytics, logging và điều hướng phía server.

export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";

export interface ParsedUA {
  deviceType: DeviceType;
  os: string;
  browser: string;
  isBot: boolean;
}

const EMPTY_RESULT: ParsedUA = {
  deviceType: "unknown",
  os: "Unknown",
  browser: "Unknown",
  isBot: false,
};

// Bot/crawler chung — kiểm tra trước để bỏ qua các bước phân tích khác nếu cần
const BOT_RE =
  /bot|crawl|spider|slurp|googlebot|bingbot|yandex|baiduspider|facebookexternalhit|whatsapp|telegram/i;

// Tablet kiểm tra trước mobile vì Android tablet KHÔNG chứa "Mobile" trong UA
const TABLET_RE = /iPad|Android(?!.*Mobile)|Tablet|Kindle|Silk/i;
const MOBILE_RE = /Mobile|iPhone|Android.*Mobile|webOS|BlackBerry|Opera Mini|IEMobile/i;

function detectDevice(ua: string): DeviceType {
  if (TABLET_RE.test(ua)) return "tablet";
  if (MOBILE_RE.test(ua)) return "mobile";
  return "desktop";
}

function detectOS(ua: string): string {
  // iOS: iPhone OS X_Y hoặc (cho iPad cũ) CPU OS X_Y
  const ios = ua.match(/(?:iPhone OS|CPU OS|iPad; CPU OS)\s+(\d+)[._]/i);
  if (ios) return `iOS ${ios[1]}`;

  // Android phải kiểm tra sau iOS vì một số UA giả mạo có thể chứa cả hai
  const android = ua.match(/Android\s+(\d+(?:\.\d+)?)/i);
  if (android) return `Android ${android[1]}`;

  // macOS: chuyển định dạng "Mac OS X 10_15_7" thành major version đọc được
  const mac = ua.match(/Mac OS X\s+(\d+)[._](\d+)/i);
  if (mac) {
    const major = parseInt(mac[1], 10);
    const minor = parseInt(mac[2], 10);
    // 10.x → dùng minor làm version chính (10.14 = Mojave...), 11+ dùng major
    const version = major === 10 ? `10.${minor}` : `${major}`;
    return `macOS ${version}`;
  }

  // Windows NT 10.0 bao gồm cả Win 10 và Win 11 (UA không phân biệt được)
  const winNT = ua.match(/Windows NT\s+(\d+\.\d+)/i);
  if (winNT) {
    const map: Record<string, string> = {
      "10.0": "10/11",
      "6.3": "8.1",
      "6.2": "8",
      "6.1": "7",
      "6.0": "Vista",
      "5.1": "XP",
    };
    return `Windows ${map[winNT[1]] ?? winNT[1]}`;
  }

  if (/Linux/i.test(ua)) return "Linux";
  return "Unknown";
}

function detectBrowser(ua: string): string {
  // Edge phải đứng trước Chrome vì UA của Edge chứa "Chrome" và "Safari"
  // Edg/ (Chromium-based), Edge/ (legacy), EdgA/ (Android), EdgiOS/ (iOS)
  const edge = ua.match(/Edg(?:e|A|iOS)?\/(\d+)/i);
  if (edge) return `Edge ${edge[1]}`;

  // Opera: OPR/ (Chromium-based) hoặc Opera/
  const opera = ua.match(/(?:OPR|Opera)\/(\d+)/i);
  if (opera) return `Opera ${opera[1]}`;

  // Samsung Internet trước Chrome vì cũng chứa Chrome trong UA
  const samsung = ua.match(/SamsungBrowser\/(\d+)/i);
  if (samsung) return `Samsung Internet ${samsung[1]}`;

  // Firefox trước Chrome vì độc lập với chuỗi Chrome/Safari
  const firefox = ua.match(/Firefox\/(\d+)/i);
  if (firefox) return `Firefox ${firefox[1]}`;

  const chrome = ua.match(/Chrome\/(\d+)/i);
  if (chrome) return `Chrome ${chrome[1]}`;

  // Safari: Version/X.Y Safari/... — chỉ Safari thực sự mới có "Version/"
  const safari = ua.match(/Version\/(\d+)[^\s]*\s+(?:Mobile\/\S+\s+)?Safari/i);
  if (safari) return `Safari ${safari[1]}`;

  // IE: MSIE (cũ) hoặc Trident/...; rv:X (IE11)
  const ie = ua.match(/MSIE\s+(\d+)/i) ?? ua.match(/Trident\/.*rv:(\d+)/i);
  if (ie) return `IE ${ie[1]}`;

  return "Unknown";
}

export function parseUserAgent(ua: string | null | undefined): ParsedUA {
  if (!ua || typeof ua !== "string" || ua.trim() === "") {
    return { ...EMPTY_RESULT };
  }

  const isBot = BOT_RE.test(ua);
  return {
    deviceType: detectDevice(ua),
    os: detectOS(ua),
    browser: detectBrowser(ua),
    isBot,
  };
}
