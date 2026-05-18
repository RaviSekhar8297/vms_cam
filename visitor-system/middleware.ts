import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "./lib/auth";

const protectedRoutes = ["/dashboard", "/organizations", "/users", "/visitors"];
const publicRoutes = ["/login"];

export async function middleware(req: NextRequest) {
    const path = req.nextUrl.pathname;
    const isProtectedRoute = protectedRoutes.some((route) =>
        path.startsWith(route)
    );
    const isPublicRoute = publicRoutes.includes(path);
    const isApiRoute = path.startsWith("/api");

    // Handle CORS for API routes
    if (isApiRoute) {
        const origin = req.headers.get("origin") ?? "";
        const allowedOrigin = origin.includes("10.20.13.184") || origin.includes("localhost") ? origin : "*";
        
        const corsHeaders = {
            "Access-Control-Allow-Origin": allowedOrigin,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
        };

        // If credentials are required and origin is specific
        if (allowedOrigin !== "*") {
            corsHeaders["Access-Control-Allow-Credentials"] = "true";
        }

        if (req.method === "OPTIONS") {
            return new NextResponse(null, { status: 200, headers: corsHeaders });
        }

        const response = NextResponse.next();
        Object.entries(corsHeaders).forEach(([key, value]) => {
            response.headers.set(key, value);
        });

        return response;
    }

    const cookie = req.cookies.get("session")?.value;
    const session = cookie ? await decrypt(cookie).catch(() => null) : null;

    if (isProtectedRoute && !session?.user) {
        return NextResponse.redirect(new URL("/login", req.nextUrl));
    }

    if (isPublicRoute && session?.user) {
        return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }

    // Enforce role access — handle both flat and nested session shapes
    const sessionUserRole = session?.user?.user?.role || session?.user?.role;
    const allowedForOrgs = ["SUPERADMIN", "ADMIN", "RECEPTIONIST", "EMPLOYEE"];

    if (path.startsWith("/organizations") && !allowedForOrgs.includes(sessionUserRole)) {
        return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico).*)",
        // No longer excluding 'api' here since we handle it inside the middleware function for better control
    ],
};
