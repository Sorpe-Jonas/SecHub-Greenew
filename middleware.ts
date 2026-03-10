import { NextResponse } from "next/server";

import { auth } from "@/auth";

const protectedRoutes = [
  "/dashboard",
  "/vault",
  "/support",
  "/grafana-unconfigured",
  "/timesheet",
  "/financial",
  "/companies",
  "/audit",
  "/settings",
  "/users",
];

export default auth((request) => {
  const isAuthenticated = Boolean(request.auth);
  const { pathname } = request.nextUrl;
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  if (!isAuthenticated && isProtectedRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isAuthenticated && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const response = NextResponse.next();

  if (isProtectedRoute) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  return response;
});

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/vault/:path*",
    "/support/:path*",
    "/grafana-unconfigured",
    "/timesheet/:path*",
    "/financial/:path*",
    "/companies/:path*",
    "/audit/:path*",
    "/settings/:path*",
    "/users/:path*",
  ],
};
