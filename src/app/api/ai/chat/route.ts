import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Bạn là AI Assistant của Lê Đăng Khương Academy — nền tảng học tập marketing và thương hiệu cá nhân hàng đầu Việt Nam.

Vai trò của bạn:
- Hỗ trợ học viên học tập hiệu quả hơn
- Trả lời câu hỏi về marketing, personal brand, digital product, email marketing
- Giúp học viên áp dụng kiến thức từ khoá học vào thực tế
- Gợi ý nội dung và chiến lược phù hợp với học viên

Phong cách:
- Thân thiện, gần gũi nhưng chuyên nghiệp
- Trả lời bằng tiếng Việt
- Ngắn gọn, đi thẳng vào vấn đề
- Dùng ví dụ thực tế khi có thể
- Khi không chắc, hãy thành thật và đề nghị học viên liên hệ trực tiếp với Lê Đăng Khương

Giới hạn:
- Không đưa ra lời khuyên pháp lý hoặc tài chính cụ thể
- Không làm bài tập thay học viên
- Luôn khuyến khích học viên tự thực hành`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages, context } = await req.json();
  if (!messages?.length) return NextResponse.json({ error: "Messages required" }, { status: 400 });

  // Input validation: limit messages array size and total content length
  if (messages.length > 30) {
    return NextResponse.json({ error: "Quá nhiều tin nhắn. Vui lòng bắt đầu cuộc hội thoại mới." }, { status: 400 });
  }
  const totalLength = messages.reduce((sum: number, m: any) => sum + (m.content?.length || 0), 0);
  if (totalLength > 30000) {
    return NextResponse.json({ error: "Nội dung quá dài" }, { status: 400 });
  }

  // Per-user rate limiting: 20 messages per hour, backed by Upstash Redis
  // (falls back to in-memory sliding window when Upstash is not configured)
  const userId = user.id;
  const rl = await rateLimit(`ai-chat:${userId}`, 20, 3600);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Bạn đã sử dụng hết lượt chat. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  // Build system with user context
  let systemPrompt = SYSTEM_PROMPT;
  if (context?.courseName) {
    systemPrompt += `\n\nHọc viên đang học khoá: "${context.courseName}"`;
  }
  if (context?.lessonTitle) {
    systemPrompt += `\nBài học hiện tại: "${context.lessonTitle}"`;
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const reply = response.content[0].type === "text" ? response.content[0].text : "";

    // Log AI usage
    await supabase.from("analytics_events").insert({
      user_id: user.id,
      event: "ai_chat",
      properties: { tokens: response.usage.output_tokens },
    }).maybeSingle();

    return NextResponse.json({ reply, usage: response.usage });
  } catch (err) {
    console.error("AI chat error:", err);
    return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
  }
}
