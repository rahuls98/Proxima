import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const referer = request.headers.get("referer") || "";

    if (
        (pathname === "/training/session" ||
            pathname === "/training/context-builder") &&
        !referer.includes("/training")
    ) {
        return NextResponse.redirect(new URL("/training", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/training/session", "/training/context-builder"],
};
