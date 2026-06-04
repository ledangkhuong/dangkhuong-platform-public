/**
 * Rewrite Email Automations — updates all 4 existing automation sequences
 * with completely rewritten storytelling email content.
 *
 * - 17 emails total, each 500-800 words
 * - Tone: "anh em than thiet" — casual, experienced, personal
 * - NO emoji at all — zero unicode emoji
 * - Russell Brunson style: story-driven, emotional, curiosity, CTA
 * - Vietnamese with full diacritics
 *
 * Usage:
 *   node scripts/rewrite-email-automations.mjs
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// --- Load .env.local ---

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// --- Shared HTML helpers (emoji-free) ---

const BASE_URL = "https://dangkhuong.com";

function emailTemplate(bodyHtml) {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin:0; padding:0; background:#0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrap { max-width:560px; margin:0 auto; padding:32px 16px; }
    .card { background:#1a1a1a; border:1px solid #2a2a2a; border-radius:12px; padding:32px; }
    .logo { display:flex; align-items:center; gap:10px; margin-bottom:28px; }
    .logo-icon { width:36px; height:36px; border-radius:8px; background:linear-gradient(135deg,#D4A843,#B8922E); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:13px; }
    .logo-text { color:#fff; font-weight:700; font-size:16px; }
    h1 { color:#fff; font-size:22px; font-weight:700; margin:0 0 12px; line-height:1.3; }
    p { color:#9ca3af; font-size:14px; line-height:1.7; margin:0 0 16px; }
    .btn { display:inline-block; padding:12px 28px; background:#D4A843; color:#000; border-radius:8px; text-decoration:none; font-weight:600; font-size:14px; }
    .divider { height:1px; background:#2a2a2a; margin:24px 0; }
    .footer { color:#4b5563; font-size:12px; text-align:center; margin-top:24px; line-height:1.6; }
    .highlight { color:#D4A843; font-weight:600; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="logo">
      <div class="logo-icon">LDK</div>
      <div class="logo-text">Le Dang Khuong Academy</div>
    </div>
    <div class="card">
      ${bodyHtml}
    </div>
    <div class="footer">
      &copy; 2025 Le Dang Khuong Academy &middot; <a href="${BASE_URL}" style="color:#4b5563;">dangkhuong.com</a><br/>
      Bạn nhận email này vì đã đăng ký tại dangkhuong.com<br/>
      <a href="${BASE_URL}/unsubscribe?sid={{subscriber_id}}" style="color:#4b5563;">Hủy đăng ký</a>
    </div>
  </div>
</body>
</html>`;
}

// =====================================================================
//  AUTOMATION 1: WELCOME SEQUENCE (5 emails)
// =====================================================================

const welcomeFlow = {
  nodes: [
    {
      id: "trigger_1",
      type: "trigger",
      position: { x: 0, y: 0 },
      data: {
        triggerType: "tag_added",
        config: { tag: "new_user" },
      },
    },

    // --- Welcome Email 1 ---
    {
      id: "send_1",
      type: "sendEmail",
      position: { x: 0, y: 100 },
      data: {
        subject: "Chào mừng -- đây là câu chuyện bắt đầu của chúng ta",
        fromName: "Le Dang Khuong",
        htmlContent: emailTemplate(`
      <h1>Chào mừng bạn, {{name}}</h1>

      <p>Tôi vừa nhận được thông báo: bạn đã đăng ký tài khoản trên dangkhuong.com.</p>

      <p>Và tôi muốn bạn biết một điều -- khoảng khắc bạn nhấn nút "Đăng ký" đó, tôi hiểu nó hơn bất kỳ ai. Bởi vì không lâu trước đây, tôi cũng là người ngồi trước màn hình, tìm kiếm một hướng đi mới cho sự nghiệp của mình.</p>

      <p>Hồi đó, tôi không có gì cả. Không có mentor, không có cộng đồng, không có hệ thống. Chỉ có một chiếc laptop, một đường truyền internet, và một đám câu hỏi không biết hỏi ai.</p>

      <p><span class="highlight">Tôi bắt đầu bằng việc thử sai.</span> Thử rất nhiều. Chạy quảng cáo mất tiền, xây website không ai vào, viết content không ai đọc. Có những đêm tôi ngồi tính lại chi phí và tự hỏi: "Mình đang làm gì vậy?"</p>

      <p>Nhưng rồi, từ từ, từng mảnh ghép bắt đầu khớp lại. Tôi tìm ra được quy trình. Tôi hiểu được hệ thống. Và từ đó, mọi thứ thay đổi.</p>

      <p>Hôm nay, bạn đang đứng ở vị trí mà tôi đã từng đứng. Nhưng bạn có một lợi thế mà tôi không có: <span class="highlight">bạn không phải đi một mình.</span></p>

      <p>Tài khoản của bạn đã sẵn sàng. Đây là 3 điều bạn có thể làm ngay bây giờ:</p>

      <p><b>Thứ nhất, đăng nhập tại dangkhuong.com.</b> Dùng email và mật khẩu bạn vừa tạo. Mọi thứ đã được kích hoạt -- bạn chỉ cần bước vào.</p>

      <p><b>Thứ hai, xem qua kho khóa học.</b> Tôi đã sắp xếp từ cơ bản đến nâng cao, từ tư duy đến kỹ thuật. Bạn không cần học tất cả cùng lúc -- chỉ cần bắt đầu từ bài đầu tiên.</p>

      <p><b>Thứ ba, vào cộng đồng.</b> Đây là nơi hơn 600 học viên đang hỗ trợ nhau mỗi ngày. Đặt câu hỏi, chia sẻ kinh nghiệm, và kết nối với những người cùng chí hướng.</p>

      <p>À, và blog của tôi -- nơi tôi viết những bài học từ kinh nghiệm thực tế, không lý thuyết suông. Bạn có thể đọc bất kỳ lúc nào, hoàn toàn miễn phí.</p>

      <p>Tôi sẽ gửi thêm vài email trong những ngày tới để giúp bạn định hướng. Không spam, không bán hàng -- chỉ là những câu chuyện và bài học mà tôi ước gì ai đó đã chia sẻ với tôi khi tôi mới bắt đầu.</p>

      <p>Hẹn gặp bạn bên trong.</p>

      <a href="${BASE_URL}/login" class="btn">Đăng nhập ngay</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">P.S. Nếu bạn gặp bất kỳ vấn đề gì khi đăng nhập, chỉ cần reply email này. Tôi đọc tất cả và trả lời trong vòng 24 giờ.</p>
      <p style="margin:8px 0 0; font-size:13px; color:#6b7280;">-- Le Dang Khuong</p>
    `),
      },
    },
    { id: "wait_1", type: "wait", position: { x: 0, y: 200 }, data: { days: 1, hours: 0, minutes: 0 } },

    // --- Welcome Email 2 ---
    {
      id: "send_2",
      type: "sendEmail",
      position: { x: 0, y: 300 },
      data: {
        subject: "Tôi suýt bỏ cuộc -- và đây là thứ cứu tôi",
        fromName: "Le Dang Khuong",
        htmlContent: emailTemplate(`
      <h1>Tôi suýt bỏ cuộc</h1>

      <p>{{name}}, tôi muốn kể bạn nghe một câu chuyện mà tôi ít khi chia sẻ.</p>

      <p>Khoảng 2 năm trước, tôi đang chạy 5-6 công cụ khác nhau cùng lúc. Một cái để quản lý email. Một cái để tạo landing page. Một cái để theo dõi đơn hàng. Một cái để chat với khách. Và vài cái nữa mà tôi còn không nhớ tên.</p>

      <p>Mỗi tháng, tiền subscription ngốt đi gần 3 triệu. Nhưng vấn đề không phải tiền -- mà là <span class="highlight">dữ liệu nằm mỗi nơi một ít</span>. Khách hàng đăng ký nhưng không ai follow-up. Người mua hàng xong rồi mất hút. Tôi không biết ai là khách tiềm năng, ai đã mua, ai cần chăm sóc thêm.</p>

      <p>Một đêm, khoảng 1 giờ sáng, tôi ngồi lại tính. Mở spreadsheet ra, liệt kê tất cả những gì đang chạy. Và tôi nhận ra một điều đau lòng: <span class="highlight">tôi đang làm việc 14 tiếng mỗi ngày nhưng 60% thời gian là để "vận chuyển dữ liệu" giữa các công cụ.</span></p>

      <p>Đó không phải làm việc. Đó là chạy vòng tròn.</p>

      <p>Rồi tôi tự hỏi: "Nếu tất cả nằm trong một chỗ thì sao?"</p>

      <p>Câu hỏi đó thay đổi tất cả.</p>

      <p>Tôi bắt đầu xây dựng hệ thống All-In-One bằng AI Agent. Không phải vì tôi giỏi công nghệ -- mà vì tôi quá mệt mỏi với việc chắp vá. Tôi muốn một nơi duy nhất để quản lý khách hàng, gửi email, bán khóa học, xây cộng đồng, và theo dõi doanh thu.</p>

      <p>Mất 6 tháng để hoàn thiện phiên bản đầu tiên. Nhưng khi nó chạy...</p>

      <p><span class="highlight">108 triệu doanh số trong 10 ngày đầu tiên.</span></p>

      <p>Tôi không nói điều này để khoe. Tôi nói vì muốn bạn hiểu: vấn đề của hầu hết chúng ta không phải là thiếu kiến thức. Internet đầy kiến thức. YouTube đầy kiến thức. Ai cũng có thể học được.</p>

      <p>Vấn đề thật sự là <span class="highlight">thiếu hệ thống</span>. Là không có một quy trình rõ ràng để biến kiến thức thành hành động, hành động thành kết quả, kết quả thành thu nhập bền vững.</p>

      <p>Đây là lý do tôi xây dangkhuong.com. Không phải để bán khóa học -- mà để chia sẻ hệ thống mà tôi đã mất bao nhiêu năm, bao nhiêu thất bại mới xây dựng được.</p>

      <p>Nếu bạn muốn đọc chi tiết hơn về hành trình của tôi -- từ những ngày đầu tiên thất bại đến khi mọi thứ bắt đầu hoạt động -- tôi đã viết tất cả ở trang giới thiệu.</p>

      <a href="${BASE_URL}/about" class="btn">Đọc thêm về hành trình của tôi</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">P.S. Ngày mai tôi sẽ gửi cho bạn một bài học mà tôi cho là quan trọng nhất cho người mới bắt đầu. Đừng bỏ lỡ nhé.</p>
      <p style="margin:8px 0 0; font-size:13px; color:#6b7280;">-- Le Dang Khuong</p>
    `),
      },
    },
    { id: "wait_2", type: "wait", position: { x: 0, y: 400 }, data: { days: 2, hours: 0, minutes: 0 } },

    // --- Welcome Email 3 ---
    {
      id: "send_3",
      type: "sendEmail",
      position: { x: 0, y: 500 },
      data: {
        subject: "Bài học này thay đổi cách tôi nghĩ về kinh doanh online",
        fromName: "Le Dang Khuong",
        htmlContent: emailTemplate(`
      <h1>Bài học mà hầu hết người mới bỏ qua</h1>

      <p>{{name}}, tôi có một câu hỏi cho bạn: Khi bắt đầu học kinh doanh online, bạn thường làm gì trước tiên?</p>

      <p>Đa số mọi người sẽ nhảy thẳng vào kỹ thuật. Học cách chạy quảng cáo. Học cách thiết kế website. Học cách viết content. Và điều đó nghe có lý -- vì kỹ thuật là thứ có thể thấy được, đo được, làm được ngay.</p>

      <p>Nhưng đây chính là cái bẫy.</p>

      <p>Tôi muốn kể bạn nghe về Tuấn -- một học viên đăng ký từ đợt đầu tiên của tôi. Tuấn 28 tuổi, đang làm nhân viên văn phòng, muốn xây thu nhập thêm từ online. Bạn biết kiểu -- ai cũng bắt đầu với ước mơ đó.</p>

      <p>Tuấn nhảy thẳng vào học kỹ thuật. Bài 1 về Facebook Ads -- học xong, chạy liền. Bài 2 về landing page -- làm liền. Bài 3 về email marketing -- setup liền.</p>

      <p>Kết quả sau 2 tháng? <span class="highlight">Chi tiêu 8 triệu quảng cáo, doanh thu 0 đồng.</span></p>

      <p>Tuấn nhắn tin cho tôi lúc 11 giờ đêm, giỡn nửa thật nửa: "Anh ơi, em chạy hết tiền rồi mà không bán được gì. Có lẽ kinh doanh online không dành cho em."</p>

      <p>Tôi hỏi Tuấn một câu: "Em có xem bài số 0 chưa?"</p>

      <p>Bài số 0 là bài tôi đặt ngay đầu tiên trong khóa học. Không có kỹ thuật gì cả. Chỉ là tư duy. Là cách nhìn toàn cảnh về kinh doanh online. Là hiểu <span class="highlight">hệ thống trước, kỹ thuật sau</span>.</p>

      <p>Tuấn chưa xem. Anh ấy skip thẳng đến bài 1 vì nghĩ "tư duy nghe chung chung quá, tôi muốn học cái thực tế."</p>

      <p>Tôi nói Tuấn quay lại học bài 0. Xem 3 lần. Ghi chú. Rồi mới quay lại các bài còn lại.</p>

      <p>Tuấn làm theo. Và sau đó, anh ấy nhận ra vấn đề: anh ấy đang chạy quảng cáo mà không hiểu khách hàng của mình là ai. Làm landing page mà không biết mối quan hệ giữa các bước trong phễu bán hàng. Gửi email mà không có chiến lược tổng thể.</p>

      <p>Tháng thứ 3, Tuấn bắt đầu lại từ đầu -- nhưng lần này với tư duy hệ thống. Mọi thứ click. Quảng cáo hiệu quả hơn vì biết nhắm đúng người. Landing page chuyển đổi tốt hơn vì hiểu tâm lý khách hàng. Email bán được hàng vì có quy trình rõ ràng.</p>

      <p><span class="highlight">Tháng thứ 4, Tuấn có đơn hàng đầu tiên. Tháng thứ 6, doanh thu 18 triệu.</span></p>

      <p>Bài học ở đây rất đơn giản: tư duy hệ thống không phải là lý thuyết suông. Nó là nền tảng để mọi kỹ thuật khác phát huy hiệu quả. Không có nó, bạn chỉ đang ném tiền qua cửa sổ.</p>

      <p>Tôi đã chuẩn bị sẵn bài học này cho bạn. Nó không dài -- khoảng 25 phút. Nhưng nếu bạn xem thật kỹ và ghi chú, nó sẽ thay đổi hoàn toàn cách bạn tiếp cận mọi thứ sau này.</p>

      <a href="${BASE_URL}/courses" class="btn">Xem bài học này</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">P.S. Đây là bài mà những học viên thành công nhất của tôi đều xem ít nhất 2 lần. Đừng skip nhé.</p>
      <p style="margin:8px 0 0; font-size:13px; color:#6b7280;">-- Le Dang Khuong</p>
    `),
      },
    },
    { id: "wait_3", type: "wait", position: { x: 0, y: 600 }, data: { days: 2, hours: 0, minutes: 0 } },

    // --- Welcome Email 4 ---
    {
      id: "send_4",
      type: "sendEmail",
      position: { x: 0, y: 700 },
      data: {
        subject: "Chị Thủy gọi cho tôi lúc 11 đêm -- và nói điều này",
        fromName: "Le Dang Khuong",
        htmlContent: emailTemplate(`
      <h1>Cuộc gọi lúc 11 giờ đêm</h1>

      <p>{{name}}, tôi muốn kể bạn nghe về chị Nguyễn Thị Thủy.</p>

      <p>Chị Thủy năm nay 42 tuổi. Trước khi gặp tôi, chị làm kế toán cho một công ty nhỏ ở Bình Dương. Lương 9 triệu một tháng. Chồng chị làm tài xế, hai vợ chồng nuôi 2 đứa con đang đi học.</p>

      <p>Một hôm, chị Thủy thấy quảng cáo của tôi trên Facebook. Chị đọc -- nhưng không làm gì cả. Một tuần sau, chị thấy lại. Đọc lại. Vẫn không làm gì. Đến lần thứ 3, chị nhắn tin hỏi tôi: "Anh ơi, em 42 tuổi rồi, học mấy này có muộn không?"</p>

      <p>Tôi trả lời chị một câu: "Chị ơi, tuổi không phải là rào cản. Sự do dự mới là rào cản."</p>

      <p>Chị Thủy suy nghĩ thêm 1 tuần nữa rồi quyết định thử. <span class="highlight">Chị đăng ký với tâm thế "thử xem sao, không được thì thôi."</span></p>

      <p>Tháng đầu tiên, chị học chậm. Rất chậm. Mỗi tối chị xem được 1-2 bài vì còn phải đi làm, còn phải lo cho gia đình. Chị nhắn tin cho tôi: "Anh ơi, em học chậm quá, mọi người chắc đã đi xa lắm rồi."</p>

      <p>Tôi nói: "Chị ơi, đây không phải cuộc đua. Không ai chờ đợi chị. Nhưng cũng không ai bỏ rơi chị. Chị cứ học theo tốc độ của chị."</p>

      <p>Tháng thứ 2, chị bắt đầu hiểu hệ thống. Chị thấy được bức tranh tổng thể -- từ cách thu hút khách hàng, cách xây dựng nội dung, đến cách chăm sóc và chốt đơn. Chị bắt đầu áp dụng cho một sản phẩm nhỏ -- khóa học kế toán cơ bản cho người mới.</p>

      <p>Tháng thứ 3, chị có đơn hàng đầu tiên. 800 ngàn. Không nhiều -- nhưng chị gọi cho tôi và nói: "Anh ơi, em khóc. Lần đầu tiên em kiếm được tiền từ internet. Em không nghĩ là mình làm được."</p>

      <p>Tháng thứ 4, chị bán được 30 triệu.</p>

      <p>Chị đọc lại: <span class="highlight">30 triệu. Nhiều hơn gấp 3 lần lương kế toán của chị.</span></p>

      <p>Và cuộc gọi lúc 11 giờ đêm mà tôi nói ở tiêu đề? Đó là chị Thủy gọi cho tôi để nói: "Anh ơi, em vừa nộp đơn xin nghỉ việc. Em sẽ làm đây thời gian."</p>

      <p>Tôi không nói điều này để hứa hẹn rằng bạn sẽ có kết quả giống chị Thủy. Mỗi người mỗi hoàn cảnh, mỗi xuất phát điểm khác nhau. Nhưng tôi muốn bạn biết: <span class="highlight">nếu một người phụ nữ 42 tuổi, chưa bao giờ biết gì về kinh doanh online, có thể làm được -- thì bạn cũng có cơ hội.</span></p>

      <p>Và chị Thủy không phải người duy nhất. Trong cộng đồng của chúng tôi, có hàng trăm câu chuyện tương tự. Những người bình thường, làm những việc phi thường -- chỉ vì họ quyết định bắt đầu và không bỏ cuộc.</p>

      <p>Bạn có muốn vào cộng đồng để đọc thêm những câu chuyện như vậy không? Để thấy rằng bạn không cô đơn trên hành trình này?</p>

      <a href="${BASE_URL}/community" class="btn">Vào cộng đồng xem thêm</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">P.S. Trong cộng đồng, bạn có thể hỏi bất kỳ câu hỏi nào. Những học viên đã đi trước sẽ sẵn sàng giúp đỡ bạn. Đó chính là sức mạnh của cộng đồng.</p>
      <p style="margin:8px 0 0; font-size:13px; color:#6b7280;">-- Le Dang Khuong</p>
    `),
      },
    },
    { id: "wait_4", type: "wait", position: { x: 0, y: 800 }, data: { days: 2, hours: 0, minutes: 0 } },

    // --- Welcome Email 5 ---
    {
      id: "send_5",
      type: "sendEmail",
      position: { x: 0, y: 900 },
      data: {
        subject: "Thứ 6 này, tôi mở phòng Zoom -- bạn có muốn vào không?",
        fromName: "Le Dang Khuong",
        htmlContent: emailTemplate(`
      <h1>Buổi Zoom thứ 6 này</h1>

      <p>{{name}}, tôi có một lời mời cho bạn.</p>

      <p>Mỗi thứ 6, tôi mở một phòng Zoom. Không phải webinar bán hàng với 100 trang slide và 30 phút pitch cuối buổi. Không phải buổi "free" nhưng thực ra là 90 phút quảng cáo.</p>

      <p>Đó là một buổi ngồi nói chuyện thật.</p>

      <p>Tôi kể cho bạn nghe buổi tuần trước như thế nào nhé.</p>

      <p>Có khoảng 25 người tham gia. Một bạn tên Linh, đang làm freelance thiết kế, hỏi một câu: "Anh ơi, em có kỹ năng nhưng không biết cách bán nó online. Em nên bắt đầu từ đâu?"</p>

      <p>Câu hỏi này nghe đơn giản -- nhưng nó là câu hỏi mà 80% người mới đều có. Và thay vì tôi trả lời một mình, cả phòng cùng tham gia. Anh Đức, một học viên đã xây được hệ thống, chia sẻ chính xác cách anh ấy bắt đầu từ một kỹ năng tương tự. Chị Phương, từng là nhân viên văn phòng, kể lại cách chị chuyển đổi kiến thức thành khóa học online trong 3 tuần.</p>

      <p><span class="highlight">Và Linh có moment "aha" của mình.</span> Anh ấy nói: "Em hiểu rồi. Em không cần bán kỹ năng -- em cần bán giải pháp cho một vấn đề cụ thể. Kỹ năng chỉ là công cụ." Cả phòng vỗ tay.</p>

      <p>Đó là loại khoảng khắc mà bạn không thể có được từ việc xem video hay đọc bài viết. Nó chỉ xảy ra khi người thật ngồi lại với nhau, chia sẻ thật, và cùng suy nghĩ.</p>

      <p>Buổi Zoom kéo dài 90 phút. Tôi chia sẻ kinh nghiệm thực chiến, trả lời câu hỏi trực tiếp, và thường có 1-2 chiến lược mà tôi chưa từng nói công khai. Ngoài ra, bạn sẽ được kết nối với những người đang trên cùng hành trình -- và tin tôi đi, đôi khi <span class="highlight">một cuộc trò chuyện đúng người có giá trị hơn cả một khóa học.</span></p>

      <p>Chi phí tham gia chỉ 100.000 đồng. Bằng một ly sinh tố. Nhưng giá trị bạn mang về có thể thay đổi cả hướng đi kinh doanh của bạn.</p>

      <p>Tôi nói "có thể" vì tôi không hứa suông. Nhiều người đã thay đổi sau những buổi Zoom này -- nhưng điều đó phụ thuộc vào bạn, vào cách bạn tiếp nhận và hành động. Tôi chỉ là người mở cánh cửa.</p>

      <p>Nếu bạn muốn ngồi xem thế nào, cũng được. Nếu bạn muốn đặt câu hỏi, càng tốt. Không có áp lực gì cả.</p>

      <p>Số lượng giới hạn để đảm bảo chất lượng trao đổi. Đăng ký sớm để giữ chỗ nhé.</p>

      <a href="${BASE_URL}/weballinone" class="btn">Đăng ký Zoom 100K</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">P.S. Nếu 100K là rào cản với bạn lúc này, tôi hoàn toàn hiểu. Đừng lo -- những email tiếp theo của tôi vẫn miễn phí và đầy giá trị. Bạn không mất gì cả.</p>
      <p style="margin:8px 0 0; font-size:13px; color:#6b7280;">-- Le Dang Khuong</p>
    `),
      },
    },

    { id: "end_1", type: "end", position: { x: 0, y: 1000 }, data: {} },
  ],
  edges: [
    { id: "e1", source: "trigger_1", target: "send_1" },
    { id: "e2", source: "send_1", target: "wait_1" },
    { id: "e3", source: "wait_1", target: "send_2" },
    { id: "e4", source: "send_2", target: "wait_2" },
    { id: "e5", source: "wait_2", target: "send_3" },
    { id: "e6", source: "send_3", target: "wait_3" },
    { id: "e7", source: "wait_3", target: "send_4" },
    { id: "e8", source: "send_4", target: "wait_4" },
    { id: "e9", source: "wait_4", target: "send_5" },
    { id: "e10", source: "send_5", target: "end_1" },
  ],
};


// =====================================================================
//  AUTOMATION 2: POST-PURCHASE SEQUENCE (5 emails)
// =====================================================================

const postPurchaseFlow = {
  nodes: [
    {
      id: "trigger_1",
      type: "trigger",
      position: { x: 0, y: 0 },
      data: {
        triggerType: "purchase",
        config: {},
      },
    },

    // --- Post-Purchase Email 1 ---
    {
      id: "send_1",
      type: "sendEmail",
      position: { x: 0, y: 100 },
      data: {
        subject: "Cảm ơn bạn -- và đây là 3 điều tôi muốn bạn làm ngay hôm nay",
        fromName: "Le Dang Khuong",
        htmlContent: emailTemplate(`
      <h1>Cảm ơn bạn, {{name}}</h1>

      <p>Tôi vừa nhận được thông báo: bạn đã hoàn tất đơn hàng.</p>

      <p>Và tôi muốn nói một điều thật lòng: <span class="highlight">cảm ơn bạn đã tin tưởng tôi.</span></p>

      <p>Tôi nhớ rất rõ cảm giác khi nhận đơn hàng đầu tiên trên platform này. Không phải vì tiền -- số tiền đó không thay đổi cuộc sống của tôi. Mà vì tôi biết thêm một người nữa tin rằng những gì tôi chia sẻ có giá trị. Thêm một người nữa quyết định đầu tư cho bản thân mình. Và đó là một trách nhiệm mà tôi không bao giờ xem nhẹ.</p>

      <p>Mỗi đơn hàng tôi nhận được, tôi đều tự nhủ: "Người này đã tin mình. Mình không được để họ thất vọng."</p>

      <p>Nên đây là cam kết của tôi với bạn: <span class="highlight">tôi sẽ ở đây, đồng hành cùng bạn trong từng bước.</span> Không phải kiểu nói cho đẹp -- mà là thật sự. Bạn có câu hỏi? Reply email này, tôi đọc từng email một. Bạn gặp khó khăn? Vào cộng đồng hỏi, tôi hoặc những học viên khác sẽ giúp.</p>

      <p>Bây giờ, tôi muốn bạn làm 3 điều ngay hôm nay. Không phải ngày mai, không phải cuối tuần -- mà hôm nay. Vì tôi biết nếu bạn không bắt đầu trong 24 giờ đầu tiên, khả năng bạn bỏ dở là rất cao. Và tôi không muốn điều đó xảy ra.</p>

      <p><b>Bước 1: Đăng nhập tại dangkhuong.com.</b> Dùng email và mật khẩu bạn đã đăng ký. Không cần tải gì thêm -- mọi thứ chạy trên trình duyệt.</p>

      <p><b>Bước 2: Vào khóa học bạn vừa mua.</b> Nó đã nằm sẵn trong dashboard của bạn. Click vào, xem qua cấu trúc khóa học, đọc phần giới thiệu.</p>

      <p><b>Bước 3: Xem bài 1.</b> Chỉ bài 1 thôi. Không cần xem hết -- chỉ cần bắt đầu. Bài 1 thường mất khoảng 15-20 phút. Vừa xem vừa ghi chú. Và khi xem xong, bạn sẽ có cảm giác "à, ra là vậy" -- cảm giác đó sẽ kéo bạn tiếp tục.</p>

      <p>Đó là tất cả. 3 bước. 20 phút. Bắt đầu hôm nay.</p>

      <p>Và nhớ -- bất kỳ lúc nào bạn cần hỗ trợ, chỉ cần reply email này. Tôi đọc từng email và trả lời thủ công. Không có bot, không có template. Chỉ là tôi.</p>

      <a href="${BASE_URL}/courses" class="btn">Vào khóa học ngay</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">P.S. Tôi sẽ gửi cho bạn một email nữa sau 3 ngày với một vài tip học hiệu quả. Nhưng đừng đợi email đó -- bắt đầu hôm nay nhé.</p>
      <p style="margin:8px 0 0; font-size:13px; color:#6b7280;">-- Le Dang Khuong</p>
    `),
      },
    },
    { id: "wait_1", type: "wait", position: { x: 0, y: 200 }, data: { days: 3, hours: 0, minutes: 0 } },

    // --- Post-Purchase Email 2 ---
    {
      id: "send_2",
      type: "sendEmail",
      position: { x: 0, y: 300 },
      data: {
        subject: "Ngày thứ 3 -- đa số người bỏ cuộc ở đây",
        fromName: "Le Dang Khuong",
        htmlContent: emailTemplate(`
      <h1>Ngày thứ 3</h1>

      <p>{{name}}, tôi có một con số muốn chia sẻ với bạn.</p>

      <p><span class="highlight">70% người mua khóa học online không bao giờ hoàn thành bài 1.</span></p>

      <p>Bảy mươi phần trăm. Tức là cứ 10 người bỏ tiền ra mua, 7 người không bao giờ bắt đầu học thật sự. Họ mua xong, cảm thấy vui vì đã "hành động." Rồi cuộc sống cuốn đi. Rồi khóa học nằm đó. Rồi tiền mất.</p>

      <p>Tôi không muốn bạn là một trong 7 người đó.</p>

      <p>Tôi muốn kể bạn nghe về Đạt. Đạt là một học viên đăng ký cách đây khoảng 5 tháng. Anh ấy làm sale bất động sản, ban ngày đi làm, tối về mệt quá nằm ngủ. Mua khóa học xong để đó 2 tuần không động đến.</p>

      <p>Ngày thứ 15, Đạt nhận được email của tôi -- tương tự như email này. Và anh ấy tự nhủ: "Thôi, mình đã bỏ tiền rồi, không lẽ để phang phí."</p>

      <p>Đạt bắt đầu học. Nhưng thay vì cố nhồi hết mọi thứ, anh ấy làm một điều rất đơn giản: <span class="highlight">mỗi ngày 20 phút. Không hơn, không kém. Đúng 20 phút.</span></p>

      <p>20 phút trước khi đi ngủ. Mở video lên, xem một phần bài học, ghi chú vào sổ. Sáng hôm sau đọc lại ghi chú trong lúc uống cà phê. Chỉ vậy thôi.</p>

      <p>Tuần đầu tiên, Đạt hoàn thành 3 bài. Tuần thứ hai, 4 bài. Đến tuần thứ 4, anh ấy đã hoàn thành toàn bộ module đầu tiên và bắt đầu áp dụng.</p>

      <p>Tháng thứ 2, Đạt xây xong website bán hàng đầu tiên. Tháng thứ 3, anh ấy có đơn hàng đầu tiên từ online -- 4.5 triệu. Không nhiều, nhưng đó là 4.5 triệu mà anh ấy kiếm được trong lúc ngủ, từ một hệ thống mà anh ấy tự tay xây dựng.</p>

      <p>Bây giờ, Đạt là một trong những người hoạt động tích cực nhất trong cộng đồng. Anh ấy thường xuyên giúp những học viên mới -- vì anh ấy hiểu cảm giác của người mới bắt đầu.</p>

      <p>Bí quyết của Đạt không có gì cao siêu. Nó chỉ là 3 điều:</p>

      <p><b>Một là 20 phút mỗi ngày.</b> Không cần nhiều -- nhưng phải đều. Kiên trì 20 phút/ngày tốt hơn học 5 tiếng rồi nghỉ 2 tuần.</p>

      <p><b>Hai là ghi chú.</b> Không phải ghi lại tất cả -- chỉ ghi những thứ bạn thấy "a ha." Những insight, những ý tưởng, những điều bạn muốn thử.</p>

      <p><b>Ba là đặt câu hỏi.</b> Khi không hiểu, đừng skip. Vào cộng đồng hỏi, hoặc reply email tôi. Một câu hỏi đúng lúc có thể tiết kiệm cho bạn hàng tuần mò mẫm.</p>

      <p>Bạn đang ở ngày thứ 3. Đây là ngày quyết định. Bạn sẽ là người tiếp tục, hay là người để khóa học nằm đó?</p>

      <p>Tôi tin bạn sẽ chọn đúng.</p>

      <a href="${BASE_URL}/dashboard" class="btn">Tiếp tục học</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">P.S. Nếu bạn đã xem xong bài 1 rồi, tuyệt vời. Cho tôi biết cảm nhận của bạn bằng cách reply email này nhé. Tôi muốn nghe.</p>
      <p style="margin:8px 0 0; font-size:13px; color:#6b7280;">-- Le Dang Khuong</p>
    `),
      },
    },
    { id: "wait_2", type: "wait", position: { x: 0, y: 400 }, data: { days: 4, hours: 0, minutes: 0 } },

    // --- Post-Purchase Email 3 ---
    {
      id: "send_3",
      type: "sendEmail",
      position: { x: 0, y: 500 },
      data: {
        subject: "Tôi xây cộng đồng này vì một lý do đơn giản",
        fromName: "Le Dang Khuong",
        htmlContent: emailTemplate(`
      <h1>Vì sao tôi xây cộng đồng này</h1>

      <p>{{name}}, bạn có bao giờ học một thứ gì đó một mình và cảm thấy cô đơn không?</p>

      <p>Tôi thì có. Rất nhiều lần.</p>

      <p>Trước khi xây dựng dangkhuong.com, tôi đã mua hàng chục khóa học online. Từ những khóa 500 ngàn đến những khóa 50 triệu. Từ tiếng Việt đến tiếng Anh. Từ marketing đến lập trình đến đầu tư.</p>

      <p>Và bạn biết điều gì xảy ra sau khi mua? <span class="highlight">Không ai hỏi thăm.</span></p>

      <p>Không ai hỏi: "Bạn học đến đâu rồi?" Không ai nói: "Bài này khó, để tôi giải thích lại cho bạn." Không ai chia sẻ: "Tôi cũng gặp vấn đề này, và đây là cách tôi xử lý."</p>

      <p>Bạn mua khóa học, được cho vào một hệ thống tự động, xem video một mình, mắc kẹt một mình, và -- nếu không đủ động lực -- bỏ dở một mình. Không ai biết. Không ai quan tâm.</p>

      <p>Cảm giác đó -- cảm giác "mình chỉ là một con số trong hệ thống của người khác" -- là cảm giác tôi ghét nhất. Và tôi tự hứa với mình rằng khi tôi xây platform, <span class="highlight">tôi sẽ không bao giờ để học viên của mình cảm thấy như vậy.</span></p>

      <p>Đó là lý do tôi xây cộng đồng.</p>

      <p>Cộng đồng Đăng Khương Academy không phải một cái group Facebook nơi mọi người đăng link rồi bỏ đó. Nó là một không gian được thiết kế để mọi người hỗ trợ nhau thật sự.</p>

      <p>Khi bạn hoàn thành một bài học, bạn nhận được XP. Không phải để chơi game -- mà là <span class="highlight">để đo lường sự kiên trì của bạn.</span> Mỗi XP bạn tích được là một bằng chứng rằng bạn đang tiến về phía trước. Và khi bạn thấy mình leo lên trên leaderboard, đó là cảm giác rất khác -- cảm giác mình không đứng yên, mình đang phát triển.</p>

      <p>Leaderboard không phải để cạnh tranh. Nó là để tôn vinh những người nỗ lực. Khi bạn thấy tên mình trên đó, bạn biết mình đang làm đúng. Và khi bạn thấy tên người khác, bạn biết mình không cô đơn.</p>

      <p>Trong cộng đồng, bạn có thể đặt câu hỏi và nhận được trả lời từ những người đã đi trước. Bạn có thể chia sẻ kết quả của mình và nhận được lời chúc mừng thật lòng. Bạn có thể đọc câu chuyện của người khác và tìm thấy động lực cho mình.</p>

      <p>Tôi không nói quá đâu. Có nhiều học viên nói với tôi rằng cộng đồng là lý do chính khiến họ không bỏ cuộc. Không phải khóa học -- mà là cộng đồng. Vì khi bạn biết có người đang quan tâm, bạn sẽ có lực để tiếp tục.</p>

      <p>Bạn đã mua khóa học rồi. Bây giờ, vào cộng đồng đi. Giới thiệu bản thân, chia sẻ mục tiêu của bạn, và bắt đầu kết nối.</p>

      <a href="${BASE_URL}/community" class="btn">Vào cộng đồng</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">P.S. Khi vào cộng đồng, hãy giới thiệu bản thân bằng một bài ngắn -- bạn là ai, bạn đang làm gì, và bạn muốn đạt được điều gì. Bạn sẽ bất ngờ với số người phản hồi.</p>
      <p style="margin:8px 0 0; font-size:13px; color:#6b7280;">-- Le Dang Khuong</p>
    `),
      },
    },
    { id: "wait_3", type: "wait", position: { x: 0, y: 600 }, data: { days: 7, hours: 0, minutes: 0 } },

    // --- Post-Purchase Email 4 ---
    {
      id: "send_4",
      type: "sendEmail",
      position: { x: 0, y: 700 },
      data: {
        subject: "Tôi sắp đóng ưu đãi này -- muốn nhắc bạn trước",
        fromName: "Le Dang Khuong",
        htmlContent: emailTemplate(`
      <h1>Một điều tôi muốn chia sẻ trước khi đóng ưu đãi</h1>

      <p>{{name}}, trước khi nói về ưu đãi, tôi muốn chia sẻ một khái niệm mà tôi học được từ một cuốn sách đã thay đổi cách tôi nghĩ về việc học.</p>

      <p>Khái niệm đó gọi là <span class="highlight">"compound learning" -- học tích lũy.</span></p>

      <p>Ý tưởng rất đơn giản: khi bạn học 1 khóa học, bạn biết 1 thứ. Nhưng khi bạn học 3 khóa học bổ trợ cho nhau, bạn không biết 3 thứ -- <span class="highlight">bạn hiểu cả hệ thống.</span></p>

      <p>Để tôi giải thích bằng ví dụ cụ thể.</p>

      <p>Nếu bạn chỉ học cách xây website, bạn có một website. Đẹp, chuyên nghiệp, nhưng không ai vào.</p>

      <p>Nếu bạn chỉ học marketing, bạn biết cách kéo traffic. Nhưng traffic đến rồi đi vì không có hệ thống giữ chân.</p>

      <p>Nếu bạn chỉ học bán hàng, bạn biết cách chốt đơn. Nhưng không có khách để chốt.</p>

      <p>Nhưng khi bạn học cả 3 -- website, marketing, và bán hàng -- trong một hệ thống liên kết, mọi thứ nhân lên. Website trở thành công cụ chuyển đổi. Marketing mang khách đến đúng chỗ. Bán hàng trở thành bước cuối tự nhiên trong một quy trình trọn vẹn.</p>

      <p><span class="highlight">1 + 1 + 1 không bằng 3. Nó bằng 10.</span> Đó là sức mạnh của compound learning.</p>

      <p>Và đó là lý do tôi tạo combo khóa học. Không phải để bán nhiều hơn -- mà vì tôi biết rằng học riêng lẻ sẽ không mang lại kết quả tốt nhất cho bạn. Các khóa học của tôi được thiết kế để bổ trợ nhau, để khi bạn học xong toàn bộ, bạn có một hệ thống hoàn chỉnh -- không phải những mảnh kiến thức rời rạc.</p>

      <p>Hiện tại, tôi đang có ưu đãi giảm 40% cho combo dành cho học viên hiện tại. Lý do tôi giảm chỉ cho học viên hiện tại rất đơn giản: <span class="highlight">bạn đã chứng minh mình serious bằng cách mua khóa học đầu tiên.</span> Bạn không phải người chỉ xem -- bạn là người hành động. Và tôi muốn thưởng cho điều đó.</p>

      <p>Ưu đãi này sẽ đóng lại sớm. Tôi không nói để gây áp lực -- mà vì nó thật sự sẽ đóng. Tôi không chạy kiểu "giá trị 10 triệu giảm còn 500 ngàn, chỉ hôm nay" rồi ngày mai lại giảm tiếp. Khi tôi nói đóng là đóng.</p>

      <p>Nếu bạn thấy khóa học đầu tiên có giá trị, thì combo sẽ nhân giá trị đó lên gấp bội. Xem thử và quyết định nhé.</p>

      <a href="${BASE_URL}/pricing" class="btn">Xem combo ưu đãi</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">P.S. Nếu bạn chưa sẵn sàng, không sao cả. Cứ tiếp tục học khóa hiện tại. Ưu đãi sẽ quay lại -- nhưng có thể không ở mức 40%.</p>
      <p style="margin:8px 0 0; font-size:13px; color:#6b7280;">-- Le Dang Khuong</p>
    `),
      },
    },
    { id: "wait_4", type: "wait", position: { x: 0, y: 800 }, data: { days: 16, hours: 0, minutes: 0 } },

    // --- Post-Purchase Email 5 ---
    {
      id: "send_5",
      type: "sendEmail",
      position: { x: 0, y: 900 },
      data: {
        subject: "Bạn có muốn kiếm thêm thu nhập từ điều bạn đã biết?",
        fromName: "Le Dang Khuong",
        htmlContent: emailTemplate(`
      <h1>Kiếm thêm thu nhập từ điều bạn đã biết</h1>

      <p>{{name}}, tôi muốn kể bạn nghe về anh Hùng.</p>

      <p>Anh Hùng là một học viên đã học xong khóa học của tôi cách đây khoảng 6 tháng. Anh ấy làm IT, 32 tuổi, không có kinh nghiệm bán hàng hay marketing gì cả. Sau khi học xong, anh ấy áp dụng cho công việc của mình -- xây được một hệ thống nhỏ, có thêm thu nhập. Mọi thứ ổn.</p>

      <p>Rồi một hôm, anh Hùng đọc được phần giới thiệu về chương trình affiliate của tôi. Anh ấy nghĩ: "Mình đã học, mình thấy hay, mình chia sẻ cho mấy thằng bạn thử xem."</p>

      <p>Anh Hùng gửi link giới thiệu cho đúng 3 người bạn thân. Không viết bài gì, không quảng cáo gì -- chỉ nhắn tin: "Ey, tao học cái này thấy hay, mày thử đi."</p>

      <p>2 trong 3 người đăng ký. Tháng đầu tiên, anh Hùng nhận được <span class="highlight">hoa hồng 2 triệu đồng.</span></p>

      <p>2 triệu từ việc nhắn tin cho 3 người bạn. Anh Hùng ngạc nhiên lắm.</p>

      <p>Tháng thứ 2, anh ấy bắt đầu suy nghĩ nghiêm túc hơn. Anh viết một bài review ngắn trên Facebook cá nhân -- không phải kiểu quảng cáo, mà là kiểu chia sẻ kinh nghiệm thật. Anh kể về hành trình học của mình, những gì anh học được, và kết quả anh đạt được. Bài viết không viral gì -- chỉ khoảng 50 lượt like -- nhưng có 8 người nhắn tin hỏi anh link.</p>

      <p>5 người đăng ký. Hoa hồng tháng đó: 5 triệu.</p>

      <p>Tháng thứ 3, anh Hùng bắt đầu viết đều đặn hơn. Mỗi tuần một bài. Không phải bài bán hàng -- mà là bài chia sẻ giá trị. Anh chia sẻ những gì anh học được, những sai lầm anh đã mắc, những kết quả anh đạt được. Và cuối mỗi bài, anh để link giới thiệu.</p>

      <p><span class="highlight">Tháng thứ 3: hoa hồng 12 triệu đồng.</span></p>

      <p>Bạn đọc đúng không? 12 triệu một tháng, chỉ từ việc chia sẻ những gì anh ấy đã biết, cho những người cần nghe. Không cần bán hàng. Không cần chốt deal. Không cần gọi điện. Chỉ cần chia sẻ giá trị và để link.</p>

      <p>Chương trình affiliate của tôi trả <span class="highlight">20% hoa hồng</span> trên mỗi đơn hàng. Bạn có link giới thiệu riêng, dashboard theo dõi riêng, và tôi thanh toán hoa hồng hàng tháng, minh bạch. Bạn có thể thấy chính xác bao nhiêu người click, bao nhiêu người mua, và bao nhiêu tiền bạn nhận được.</p>

      <p>Bạn không cần bán. Bạn không cần thuyết phục ai. Bạn chỉ cần chia sẻ giá trị mà bạn đã trải nghiệm, cho những người mà bạn tin là sẽ được hưởng lợi.</p>

      <p>Nếu bạn đã học khóa học và thấy nó có giá trị, thì bạn đã có sẵn mọi thứ cần thiết để bắt đầu. Kinh nghiệm của bạn chính là công cụ bán hàng tốt nhất.</p>

      <a href="${BASE_URL}/dashboard/affiliate" class="btn">Tham gia affiliate</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">P.S. Bạn không cần đợi kết quả lớn mới bắt đầu chia sẻ. Chỉ cần bạn thấy khóa học có giá trị là đủ. Nhiều affiliate thành công nhất của tôi bắt đầu từ việc chỉ chia sẻ cho 2-3 người bạn.</p>
      <p style="margin:8px 0 0; font-size:13px; color:#6b7280;">-- Le Dang Khuong</p>
    `),
      },
    },

    { id: "end_1", type: "end", position: { x: 0, y: 1000 }, data: {} },
  ],
  edges: [
    { id: "e1", source: "trigger_1", target: "send_1" },
    { id: "e2", source: "send_1", target: "wait_1" },
    { id: "e3", source: "wait_1", target: "send_2" },
    { id: "e4", source: "send_2", target: "wait_2" },
    { id: "e5", source: "wait_2", target: "send_3" },
    { id: "e6", source: "send_3", target: "wait_3" },
    { id: "e7", source: "wait_3", target: "send_4" },
    { id: "e8", source: "send_4", target: "wait_4" },
    { id: "e9", source: "wait_4", target: "send_5" },
    { id: "e10", source: "send_5", target: "end_1" },
  ],
};


// =====================================================================
//  AUTOMATION 3: RE-ENGAGEMENT SEQUENCE (3 emails)
// =====================================================================

const reEngagementFlow = {
  nodes: [
    {
      id: "trigger_1",
      type: "trigger",
      position: { x: 0, y: 0 },
      data: {
        triggerType: "tag_added",
        config: { tag: "inactive_30d" },
      },
    },

    // --- Re-engagement Email 1 ---
    {
      id: "send_1",
      type: "sendEmail",
      position: { x: 0, y: 100 },
      data: {
        subject: "Tôi nhận ra bạn đã vắng một thời gian",
        fromName: "Le Dang Khuong",
        htmlContent: emailTemplate(`
      <h1>Lâu rồi không gặp, {{name}}</h1>

      <p>Tôi nhận ra bạn đã không ghé dangkhuong.com một thời gian rồi.</p>

      <p>Và tôi không viết email này để làm bạn cảm thấy tội lỗi. Thật lòng -- tôi hiểu hoàn toàn.</p>

      <p>Vì tôi cũng đã từng như vậy.</p>

      <p>Cách đây vài năm, tôi bắt đầu một dự án mà tôi tin là sẽ thay đổi cuộc đời tôi. Tôi háo hức lắm -- lên kế hoạch, mua công cụ, học khóa học, làm mọi thứ đúng bước. Tuần đầu tiên, tôi làm việc 12 tiếng mỗi ngày. Tuần thứ hai, 8 tiếng. Tuần thứ ba, 4 tiếng.</p>

      <p>Rồi đến tuần thứ tư, tôi không động đến nữa.</p>

      <p>Không phải vì tôi không còn muốn. Không phải vì dự án đó không tốt. Mà vì <span class="highlight">cuộc sống cuốn đi.</span> Công việc bão, gia đình cần, sức khỏe có vấn đề nhỏ, một người bạn cần giúp -- và từ từ, dự án bị đẩy xuống cuối danh sách ưu tiên.</p>

      <p>3 tháng sau, tôi tình cờ mở lại folder ghi chú của dự án đó. Đọc lại những gì mình đã viết. Và tôi nhận ra một điều đau lòng: <span class="highlight">tôi đã gần đến đích mà bỏ cuộc.</span> Những gì tôi cần làm chỉ là vài bước nữa -- nhưng tôi đã để 3 tháng trôi qua mà không làm gì cả.</p>

      <p>Cảm giác đó -- cảm giác "giá như mình không bỏ" -- là cảm giác tôi không muốn bạn phải trải qua.</p>

      <p>Tôi không biết bạn đang ở đâu trên hành trình của mình. Có thể bạn đang rất bận. Có thể bạn đang gặp khó khăn. Có thể bạn chỉ đơn giản là quên. Bất kể lý do là gì, <span class="highlight">tôi muốn bạn biết: cánh cửa vẫn mở.</span></p>

      <p>Khóa học vẫn ở đó. Cộng đồng vẫn hoạt động mỗi ngày. Những bài học vẫn chờ bạn. Không có gì hết hạn, không có gì bị xóa.</p>

      <p>Và nếu bạn quay lại hôm nay, bạn sẽ thấy có nhiều điều mới. Chúng tôi đã cập nhật thêm bài học, cải thiện hệ thống XP, và cộng đồng đang sống động hơn bao giờ hết.</p>

      <p>Nhưng quan trọng hơn những điều mới là những điều cũ -- những bài học bạn đã bắt đầu nhưng chưa hoàn thành, những mục tiêu bạn đã đặt ra nhưng chưa đạt được. Chúng vẫn ở đó, chờ bạn.</p>

      <p>Không áp lực. Không deadline. Chỉ là một cánh cửa mở và một người đang chờ.</p>

      <a href="${BASE_URL}/dashboard" class="btn">Quay lại xem gì mới</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">P.S. Nếu bạn không muốn nhận email từ tôi nữa, tôi hoàn toàn tôn trọng. Bạn có thể hủy đăng ký ở link bên dưới. Không có câu hỏi nào được hỏi, không có áp lực nào cả.</p>
      <p style="margin:8px 0 0; font-size:13px; color:#6b7280;">-- Le Dang Khuong</p>
    `),
      },
    },
    { id: "wait_1", type: "wait", position: { x: 0, y: 200 }, data: { days: 3, hours: 0, minutes: 0 } },

    // --- Re-engagement Email 2 ---
    {
      id: "send_2",
      type: "sendEmail",
      position: { x: 0, y: 300 },
      data: {
        subject: "3 người này bắt đầu cùng lúc với bạn -- đây là kết quả của họ",
        fromName: "Le Dang Khuong",
        htmlContent: emailTemplate(`
      <h1>Họ bắt đầu cùng thời điểm với bạn</h1>

      <p>{{name}}, tôi muốn kể bạn nghe về 3 người đăng ký vào cùng đợt với bạn.</p>

      <p>Không phải để so sánh. Không phải để làm bạn cảm thấy tồi tệ. Mà vì tôi tin rằng <span class="highlight">đôi khi câu chuyện của người khác có thể thắp lại ngọn lửa trong mình.</span></p>

      <p><b>Người thứ nhất: Anh Minh T.</b></p>

      <p>Anh Minh làm nhân viên kinh doanh ở một công ty nhỏ. Ban ngày đi làm, tối về học. Anh ấy không có gì đặc biệt -- không giỏi công nghệ, không có kinh nghiệm kinh doanh online. Nhưng anh ấy có một thứ: sự kiên trì.</p>

      <p>Mỗi tối, anh Minh xem 1-2 bài học. Ghi chú cẩn thận. Hỏi những gì không hiểu trong cộng đồng. Và từ từ, từng bước một, anh ấy xây được một website bán hàng hoàn chỉnh. Không phải website đẹp nhất thế giới -- nhưng là một website hoạt động, có khách vào, có đơn hàng.</p>

      <p>Hôm trước anh ấy nhắn tin cho tôi: "Anh Khương ơi, em vừa nhận đơn thứ 50 từ website. Em không nghĩ là mình làm được."</p>

      <p><b>Người thứ hai: Chị Hương L.</b></p>

      <p>Chị Hương trước đây bán hàng trên Facebook -- đăng sản phẩm, đợi khách comment, inbox từng người. Mệt lắm. Chị đăng ký học với tâm thế "thử xem có cách nào nhanh hơn không."</p>

      <p>Và chị tìm thấy. Chị học cách xây phễu bán hàng tự động -- từ quảng cáo đến landing page đến email follow-up đến chốt đơn. Mất 6 tuần để set up mọi thứ. Nhưng khi nó chạy, <span class="highlight">chị có đơn hàng đầu tiên 15 triệu mà không cần inbox bất kỳ ai.</span></p>

      <p>Chị nói với tôi: "Đây là lần đầu tiên em kiếm tiền mà không phải ngồi cạnh điện thoại 24/7."</p>

      <p><b>Người thứ ba: Bạn Đức N.</b></p>

      <p>Đức là sinh viên năm 4, chưa kiếm được đồng nào từ online. Nhưng bạn ấy hoạt động rất tích cực trong cộng đồng -- hỏi câu hỏi mỗi ngày, giúp đỡ người khác, chia sẻ những gì bạn ấy học được. Trong 3 tuần, Đức leo lên Top 3 leaderboard.</p>

      <p>Chưa có doanh thu -- nhưng Đức đang xây nền tảng. Và tin tôi đi, những người hoạt động tích cực như Đức thường là những người có kết quả tốt nhất về lâu dài. Vì họ không chỉ học -- họ còn thực hành việc chia sẻ và kết nối.</p>

      <p>Ba người. Ba xuất phát điểm khác nhau. Ba câu chuyện khác nhau. Nhưng họ có chung một điều: <span class="highlight">họ không bỏ cuộc.</span></p>

      <p>Họ không giỏi hơn bạn. Họ không có nhiều thời gian hơn bạn. Họ chỉ kiên trì hơn -- 20 phút mỗi ngày, không ngừng.</p>

      <p>Bạn đã từng bắt đầu. Bạn đã từng có động lực. Và động lực đó vẫn ở đó -- chỉ cần bạn cho phép nó quay lại.</p>

      <a href="${BASE_URL}/community" class="btn">Xem cộng đồng</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">P.S. Nếu bạn quay lại cộng đồng hôm nay, hãy giới thiệu lại bản thân. Nói "Tôi đã quay lại." Bạn sẽ bất ngờ với số người chào đón bạn.</p>
      <p style="margin:8px 0 0; font-size:13px; color:#6b7280;">-- Le Dang Khuong</p>
    `),
      },
    },
    { id: "wait_2", type: "wait", position: { x: 0, y: 400 }, data: { days: 4, hours: 0, minutes: 0 } },

    // --- Re-engagement Email 3 ---
    {
      id: "send_3",
      type: "sendEmail",
      position: { x: 0, y: 500 },
      data: {
        subject: "Tôi dành cho bạn 1 ưu đãi -- nhưng chỉ trong 48 giờ",
        fromName: "Le Dang Khuong",
        htmlContent: emailTemplate(`
      <h1>48 giờ -- và tôi muốn thẳng thắn với bạn</h1>

      <p>{{name}}, tôi sẽ không vòng vo. Email này là về một ưu đãi, và tôi muốn thẳng thắn về lý do tôi gửi nó.</p>

      <p>Tôi hiểu rằng đôi khi, rào cản không phải là thiếu động lực. Không phải là không có thời gian. Mà là <span class="highlight">chi phí.</span></p>

      <p>Có thể khi bạn đăng ký, bạn đã đầu tư một khoản tiền và cảm thấy chưa sẵn sàng đầu tư thêm. Có thể bạn đang ở giai đoạn mà mỗi đồng tiền đều phải cân nhắc. Tôi hiểu -- tôi đã từng ở đó.</p>

      <p>Nên đây là những gì tôi muốn làm: <span class="highlight">giảm 50% cho bạn.</span></p>

      <p>Không phải vì bạn đặc biệt hơn ai. Không phải vì tôi đang cần bán hàng. Mà vì tôi tin bạn chỉ cần một cú hích. Một lý do để quay lại, để bắt đầu lại, để tiếp tục hành trình mà bạn đã bắt đầu.</p>

      <p>Tôi muốn nói về một khái niệm mà các nhà kinh tế học gọi là "sunk cost" -- chi phí chìm. Ý tưởng là thế này: khi bạn đã đầu tư thời gian, tiền bạc, và công sức vào một thứ gì đó, việc bỏ dở có nghĩa là tất cả những gì bạn đã đầu tư đều mất trắng. Không phải vì thứ đó không có giá trị -- mà vì bạn dừng lại trước khi nhận được giá trị.</p>

      <p>Bạn đã đầu tư thời gian để đăng ký. Bạn đã đọc những email của tôi. Bạn đã suy nghĩ về việc thay đổi. Tất cả những điều đó là đầu tư thật sự -- và chúng chỉ có giá trị nếu bạn tiếp tục.</p>

      <p>Tôi không muốn bạn tiếp tục vì tôi nói bạn nên tiếp tục. Tôi muốn bạn tiếp tục vì bạn biết, sâu đây trong lòng, rằng <span class="highlight">bạn xứng đáng có một cuộc sống tốt hơn những gì bạn đang có.</span></p>

      <p>50% giảm giá. Có hiệu lực trong 48 giờ kể từ khi bạn nhận email này. Không gia hạn. Không ngoại lệ. Sau 48 giờ, giá trở về bình thường và tôi sẽ không gửi thêm email nào về ưu đãi này nữa.</p>

      <p>Nếu bạn sẵn sàng, click vào link bên dưới. Nếu không, tôi hoàn toàn tôn trọng. Dầu bằng nào, tôi vẫn chúc bạn mọi điều tốt đẹp nhất trên hành trình của bạn.</p>

      <a href="${BASE_URL}/pricing" class="btn">Nhận ưu đãi 50%</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">P.S. Đây là email cuối cùng trong chuỗi email này. Sau email này, tôi sẽ không gửi thêm email nào nữa về ưu đãi. Quyết định là của bạn.</p>
      <p style="margin:8px 0 0; font-size:13px; color:#6b7280;">-- Le Dang Khuong</p>
    `),
      },
    },

    { id: "end_1", type: "end", position: { x: 0, y: 600 }, data: {} },
  ],
  edges: [
    { id: "e1", source: "trigger_1", target: "send_1" },
    { id: "e2", source: "send_1", target: "wait_1" },
    { id: "e3", source: "wait_1", target: "send_2" },
    { id: "e4", source: "send_2", target: "wait_2" },
    { id: "e5", source: "wait_2", target: "send_3" },
    { id: "e6", source: "send_3", target: "end_1" },
  ],
};


// =====================================================================
//  AUTOMATION 4: EVENT/WEBINAR SEQUENCE (4 emails)
// =====================================================================

const eventWebinarFlow = {
  nodes: [
    {
      id: "trigger_1",
      type: "trigger",
      position: { x: 0, y: 0 },
      data: {
        triggerType: "tag_added",
        config: { tag: "event_registered" },
      },
    },

    // --- Event Email 1 ---
    {
      id: "send_1",
      type: "sendEmail",
      position: { x: 0, y: 100 },
      data: {
        subject: "Xác nhận: bạn đã có chỗ trong buổi Zoom",
        fromName: "Le Dang Khuong",
        htmlContent: emailTemplate(`
      <h1>Bạn đã có chỗ, {{name}}</h1>

      <p>Xác nhận: bạn đã đăng ký thành công buổi Zoom live cùng tôi.</p>

      <p>Và tôi muốn nói điều này: <span class="highlight">bạn đã chọn đúng.</span> Không phải vì tôi nói -- mà vì tôi biết buổi Zoom này sẽ khác với bất kỳ webinar nào bạn đã từng xem.</p>

      <p>Để tôi kể bạn nghe buổi Zoom trước như thế nào.</p>

      <p>Có khoảng 30 người tham gia. Đầu buổi, tôi chia sẻ một chiến lược về cách xây hệ thống bán hàng tự động -- không phải lý thuyết, mà là chính xác những gì tôi đang làm, với số liệu cụ thể. Rồi tôi mở phần Q&A.</p>

      <p>Và đây là lúc mọi thứ trở nên thú vị.</p>

      <p>Bạn Minh -- một người mới hoàn toàn, chưa bao giờ làm kinh doanh online -- hỏi một câu: "Anh ơi, em có 0 đồng và 0 kinh nghiệm. Em có nên bắt đầu không?"</p>

      <p>Cả phòng im lặng 10 giây. Không phải vì câu hỏi đó ngớ -- mà vì <span class="highlight">nó là câu hỏi mà rất nhiều người muốn hỏi nhưng không dám hỏi.</span></p>

      <p>Tôi trả lời bạn Minh. Nhưng không chỉ tôi -- 4-5 người khác trong phòng cũng chia sẻ kinh nghiệm của họ. Người thì bắt đầu từ 0, người thì thất bại 3 lần trước khi thành công. Và bạn Minh nhận được không chỉ một câu trả lời -- mà cả một bức tranh về những gì có thể xảy ra nếu bạn bắt đầu.</p>

      <p>Đó là điều mà không video nào, không bài viết nào có thể thay thế. Người thật, câu chuyện thật, cảm xúc thật.</p>

      <p>Buổi Zoom của chúng ta sẽ diễn ra vào:</p>

      <p><b>Thời gian:</b> Thứ 6 tuần này, 20:00<br/>
      <b>Thời lượng:</b> 90 phút<br/>
      <b>Nền tảng:</b> Zoom Meeting<br/>
      <b>Hình thức:</b> Chia sẻ + Hỏi đáp trực tiếp</p>

      <p>Link Zoom sẽ được gửi cho bạn trong email nhắc nhở trước buổi học 1 ngày. Trong lúc chờ, tôi khuyên bạn vào nhóm Zalo để nhận tài liệu chuẩn bị và gặp gỡ những người sẽ tham gia cùng bạn.</p>

      <p>Buổi này không có slide 100 trang. Không có phần pitch 30 phút cuối buổi. Chỉ là tôi, bạn, và những người cùng chí hướng, ngồi lại nói chuyện thật về kinh doanh online.</p>

      <a href="https://zalo.me/g/mwrjxixtjhe0aed8fkdf" class="btn">Vào nhóm Zalo chuẩn bị</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">P.S. Giữ email này để tham khảo. Và nếu bạn có câu hỏi muốn hỏi trong buổi Zoom, hãy ghi lại từ bây giờ -- những câu hỏi được chuẩn bị trước thường là những câu hỏi hay nhất.</p>
      <p style="margin:8px 0 0; font-size:13px; color:#6b7280;">-- Le Dang Khuong</p>
    `),
      },
    },
    { id: "wait_1", type: "wait", position: { x: 0, y: 200 }, data: { days: 5, hours: 0, minutes: 0 } },

    // --- Event Email 2 ---
    {
      id: "send_2",
      type: "sendEmail",
      position: { x: 0, y: 300 },
      data: {
        subject: "Ngày mai gặp nhau -- đây là điều tôi muốn bạn chuẩn bị",
        fromName: "Le Dang Khuong",
        htmlContent: emailTemplate(`
      <h1>Ngày mai, 20:00</h1>

      <p>{{name}}, chỉ còn 1 ngày nữa.</p>

      <p>Ngày mai lúc 20:00, chúng ta sẽ gặp nhau trên Zoom. Và tôi muốn bạn biết: tôi đã chuẩn bị rất kỹ cho buổi này.</p>

      <p>Thường thì tôi không tiết lộ trước nội dung. Nhưng lần này, tôi muốn chia sẻ một điều để bạn có lý do để không bỏ lỡ:</p>

      <p><span class="highlight">Có một chiến lược mà tôi chưa từng nói công khai.</span></p>

      <p>Không phải vì tôi giấu -- mà vì nó cần được giải thích trực tiếp, với ví dụ cụ thể, và với phản hồi đáp ngay tại chỗ. Viết thành bài blog hay quay video sẽ không truyền tải được hết. Nó cần cuộc trò chuyện.</p>

      <p>Tôi chỉ có thể nói thế này: chiến lược này là thứ đã giúp tôi tăng doanh thu gấp 3 lần trong vòng 60 ngày, mà không cần tăng chi phí quảng cáo. Không phải hack, không phải trick. Là một cách tiếp cận hoàn toàn khác về cách nhìn nhận mối quan hệ với khách hàng.</p>

      <p>Tôi sẽ mở ra chiến lược này trong buổi Zoom ngày mai. Và tôi sẽ chỉ cho bạn cách áp dụng nó -- bất kể bạn đang ở giai đoạn nào.</p>

      <p>Bây giờ, tôi muốn bạn chuẩn bị vài điều trước buổi Zoom:</p>

      <p><b>Thứ nhất: Kiểm tra Zoom.</b> Đảm bảo bạn đã cài app hoặc có thể truy cập trên trình duyệt. Kiểm tra micro và camera -- dù bạn không bật camera cũng được, nhưng micro thì cần để đặt câu hỏi.</p>

      <p><b>Thứ hai: Chuẩn bị giấy bút.</b> Nghe thì có vẻ cũ kỹ, nhưng tôi tin vào việc ghi chú bằng tay. Nó giúp bạn xử lý thông tin sâu hơn là chỉ ngồi nghe. Những người ghi chú trong buổi Zoom của tôi thường là những người có kết quả tốt nhất sau đó.</p>

      <p><b>Thứ ba: Đặt tâm thế sẵn sàng.</b> Không phải "thử xem sao." Mà là "tôi sẽ học được ít nhất 1 điều có thể áp dụng ngay." Với tâm thế đó, bạn sẽ thấy buổi Zoom có giá trị gấp 10 lần.</p>

      <p>Tôi sẽ gửi link Zoom vào email nhắc nhở ngày mai. Bây giờ, lưu link này lại để không quên:</p>

      <a href="${BASE_URL}/weballinone" class="btn">Lưu link Zoom</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">P.S. Nếu bạn không thể tham gia live, đừng lo -- tôi sẽ gửi replay sau. Nhưng tôi khuyên bạn nên tham gia live nếu có thể. Energy của buổi live, những câu hỏi bất ngờ, những khoảng khắc "aha" -- những thứ đó không thể replay được.</p>
      <p style="margin:8px 0 0; font-size:13px; color:#6b7280;">-- Le Dang Khuong</p>
    `),
      },
    },
    { id: "wait_2", type: "wait", position: { x: 0, y: 400 }, data: { days: 2, hours: 0, minutes: 0 } },

    // --- Event Email 3 ---
    {
      id: "send_3",
      type: "sendEmail",
      position: { x: 0, y: 500 },
      data: {
        subject: "Replay đã sẵn sàng -- cùng tất cả tài liệu",
        fromName: "Le Dang Khuong",
        htmlContent: emailTemplate(`
      <h1>Replay và tài liệu đã sẵn sàng</h1>

      <p>{{name}}, cảm ơn bạn.</p>

      <p>Dù bạn đã tham gia buổi Zoom live hay không, tôi muốn gửi lời cảm ơn chân thành. Vì việc đăng ký đã cho thấy bạn nghiêm túc với hành trình của mình.</p>

      <p>Buổi Zoom vừa rồi là một trong những buổi tốt nhất chúng tôi từng có. Và tôi muốn chia sẻ với bạn những điều chính từ buổi đó.</p>

      <p><b>Takeaway thứ nhất:</b> Hệ thống đánh bại chiến thuật. Rất nhiều người chạy theo các "trick" ngắn hạn -- một cái hack Facebook, một cái template email, một cái công thức headline. Nhưng những người thành công bền vững là những người xây hệ thống. Một hệ thống tốt sẽ tiếp tục hoạt động ngay cả khi bạn ngủ, khi bạn đi du lịch, khi bạn không ngồi trước máy tính.</p>

      <p><b>Takeaway thứ hai:</b> Khách hàng không mua sản phẩm -- họ mua giải pháp cho vấn đề của họ. Khi bạn ngừng suy nghĩ "tôi bán gì" và bắt đầu suy nghĩ "tôi giải quyết vấn đề gì," mọi thứ thay đổi. Đó là bước chuyển từ người bán hàng thành người giúp đỡ -- và người giúp đỡ luôn bán được nhiều hơn.</p>

      <p><b>Takeaway thứ ba:</b> 20 phút mỗi ngày tốt hơn 5 tiếng mỗi tuần. Sự nhất quán đánh bại sự nỗ lực. Những người học 20 phút mỗi ngày có tỷ lệ hoàn thành khóa học cao gấp 4 lần so với những người học "khi nào có thời gian." Đặt lịch cố định, tạo thói quen, và sự nhất quán sẽ làm phần còn lại.</p>

      <p>Đây là tất cả tài liệu từ buổi Zoom:</p>

      <p>-- Video replay đầy đủ -- xem không giới hạn thời gian<br/>
      -- Slide trình bày -- để bạn đọc lại và ghi chú thêm<br/>
      -- Tài liệu bổ sung -- những link và tài nguyên tôi đã đề cập trong buổi</p>

      <p>Tất cả nằm trong link bên dưới.</p>

      <p>Và nếu bạn đã bỏ lỡ buổi live -- đây là cơ hội để xem lại. Nhưng tôi phải nói thật: <span class="highlight">energy của buổi live là thứ không thể replay được.</span> Những câu hỏi bất ngờ, những khoảng khắc im lặng suy nghĩ, những tiếng cười khi ai đó chia sẻ một trải nghiệm hài hước -- những thứ đó chỉ xảy ra một lần.</p>

      <p>Nên nếu lần sau có buổi Zoom nữa, tôi khuyên bạn hãy tham gia live. Trải nghiệm sẽ khác hoàn toàn.</p>

      <a href="${BASE_URL}/courses" class="btn">Xem replay ngay</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">P.S. Nếu bạn có câu hỏi thêm sau khi xem replay, cứ reply email này. Tôi luôn sẵn sàng hỗ trợ.</p>
      <p style="margin:8px 0 0; font-size:13px; color:#6b7280;">-- Le Dang Khuong</p>
    `),
      },
    },
    { id: "wait_3", type: "wait", position: { x: 0, y: 600 }, data: { days: 2, hours: 0, minutes: 0 } },

    // --- Event Email 4 ---
    {
      id: "send_4",
      type: "sendEmail",
      position: { x: 0, y: 700 },
      data: {
        subject: "Ưu đãi cho người tham dự -- 48 giờ duy nhất",
        fromName: "Le Dang Khuong",
        htmlContent: emailTemplate(`
      <h1>48 giờ -- dành cho người tham dự</h1>

      <p>{{name}}, trong buổi Zoom vừa rồi, nhiều bạn hỏi tôi cùng một câu hỏi:</p>

      <p>"Anh ơi, làm sao để đi sâu hơn? Làm sao để không chỉ hiểu mà còn áp dụng được?"</p>

      <p>Câu trả lời của tôi luôn là một: <span class="highlight">hệ thống Web All-In-One.</span></p>

      <p>Buổi Zoom là nơi tôi chia sẻ kiến thức. Nhưng kiến thức mà không có hệ thống thì chỉ là thông tin -- nó nằm trong đầu bạn một thời gian rồi từ từ biến mất. Hệ thống Web All-In-One là nơi bạn biến kiến thức thành hành động, hành động thành kết quả.</p>

      <p>Tôi muốn kể bạn nghe về Hạnh -- một bạn tham gia buổi Zoom trước đó. Hạnh nghe xong, cảm thấy háo hức, nhưng rồi không làm gì cả. Hai tuần sau, Hạnh tham gia buổi Zoom tiếp theo. Nghe xong, lại cảm thấy háo hức. Rồi lại không làm gì cả.</p>

      <p>Đến buổi Zoom thứ 3, Hạnh quyết định: "Thôi, mình không thể cứ nghe mãi được. Mình phải làm."</p>

      <p>Hạnh đăng ký hệ thống Web All-In-One ngay sau buổi Zoom. Và đây là điều xảy ra:</p>

      <p>Tuần 1: Hạnh set up xong website và hệ thống email cơ bản. Không đẹp lắm -- nhưng nó chạy được.</p>

      <p>Tuần 2: Hạnh tạo xong sản phẩm đầu tiên và phễu bán hàng. Bắt đầu chạy quảng cáo với 50 ngàn/ngày.</p>

      <p><span class="highlight">Ngày thứ 16: Đơn hàng đầu tiên. 1.2 triệu đồng.</span></p>

      <p>Hạnh nhắn tin cho tôi: "Anh ơi, em khóc. Không phải vì 1.2 triệu. Mà vì em biết hệ thống này sẽ tiếp tục chạy. Em ngủ mà nó vẫn bán."</p>

      <p>Đó là sự khác biệt giữa người nghe và người làm. Và hệ thống Web All-In-One là công cụ để bạn chuyển từ người nghe thành người làm.</p>

      <p>Tôi không thường xuyên làm điều này -- nhưng vì bạn đã đầu tư thời gian tham gia buổi Zoom, tôi muốn dành cho bạn một ưu đãi đặc biệt. <span class="highlight">Ưu đãi này chỉ dành cho người đã tham dự và chỉ kéo dài 48 giờ.</span></p>

      <p>Tôi không để giá cụ thể trong email này vì nó phụ thuộc vào gói bạn chọn. Nhưng tôi có thể nói: <span class="highlight">đây là mức giá tốt nhất mà tôi từng offer.</span> Và sau 48 giờ, nó sẽ không còn nữa.</p>

      <p>Không gia hạn. Không ngoại lệ. Tôi tôn trọng thời gian của bạn bằng cách tôn trọng lời nói của tôi.</p>

      <p>Nếu bạn đã sẵn sàng chuyển từ "nghe" sang "làm" -- đây là thời điểm.</p>

      <a href="${BASE_URL}/weballinone" class="btn">Nhận ưu đãi</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">P.S. Nếu bạn có bất kỳ câu hỏi nào về hệ thống Web All-In-One trước khi quyết định, reply email này. Tôi sẽ trả lời trực tiếp -- không có bot, không có template.</p>
      <p style="margin:8px 0 0; font-size:13px; color:#6b7280;">-- Le Dang Khuong</p>
    `),
      },
    },

    { id: "end_1", type: "end", position: { x: 0, y: 800 }, data: {} },
  ],
  edges: [
    { id: "e1", source: "trigger_1", target: "send_1" },
    { id: "e2", source: "send_1", target: "wait_1" },
    { id: "e3", source: "wait_1", target: "send_2" },
    { id: "e4", source: "send_2", target: "wait_2" },
    { id: "e5", source: "wait_2", target: "send_3" },
    { id: "e6", source: "send_3", target: "wait_3" },
    { id: "e7", source: "wait_3", target: "send_4" },
    { id: "e8", source: "send_4", target: "end_1" },
  ],
};


// =====================================================================
//  UPDATE DEFINITIONS
// =====================================================================

const UPDATES = [
  { name: "Welcome Sequence", flow_definition: welcomeFlow },
  { name: "Post-Purchase Sequence", flow_definition: postPurchaseFlow },
  { name: "Re-engagement Sequence", flow_definition: reEngagementFlow },
  { name: "Event/Webinar Sequence", flow_definition: eventWebinarFlow },
];


// =====================================================================
//  MAIN — update existing automations
// =====================================================================

async function main() {
  console.log("=== Rewrite Email Automations ===\n");

  let updated = 0;
  let failed = 0;

  for (const { name, flow_definition } of UPDATES) {
    const { data, error } = await supabase
      .from("email_automations")
      .update({ flow_definition })
      .eq("name", name)
      .select("id, name")
      .single();

    if (error) {
      console.error(`  FAIL  "${name}" -- ${error.message}`);
      failed++;
    } else {
      console.log(`  OK    "${data.name}" -- id: ${data.id} -- flow_definition updated`);
      updated++;
    }
  }

  console.log(`\nDone: ${updated} updated, ${failed} failed.`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
