import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
    return NextResponse.json(
        { version: process.env.APP_BUILD_ID },
        { headers: { "Cache-Control": "no-store" } },
    );
}
