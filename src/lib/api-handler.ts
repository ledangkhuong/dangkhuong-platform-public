import { NextRequest, NextResponse } from "next/server";

export function withErrorHandler(
  handler: (req: NextRequest, ctx?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx?: any) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      console.error(`${req.method} ${req.nextUrl.pathname} error:`, err);
      return NextResponse.json(
        { error: "Không thể thực hiện. Vui lòng thử lại." },
        { status: 500 }
      );
    }
  };
}
