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

  return NextResponse.next();
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
