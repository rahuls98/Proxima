import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (pathname === "/training") {
        return NextResponse.redirect(
            new URL("/training/context-builder", request.url)
        );
    }

    if (pathname === "/training/session") {
        return NextResponse.redirect(
            new URL("/training/context-builder", request.url)
        );
    }

    if (pathname === "/training/session-report") {
        const sessionId = request.nextUrl.searchParams.get("session_id");

        if (sessionId) {
            return NextResponse.redirect(
                new URL(`/training/${sessionId}/report`, request.url)
            );
        }

        return NextResponse.redirect(
            new URL("/training/context-builder", request.url)
        );
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/training", "/training/session", "/training/session-report"],
};
