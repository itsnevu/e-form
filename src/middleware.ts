import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const isDashboard = req.nextUrl.pathname.startsWith("/dashboard");

  if (isDashboard && !req.auth) {
    return NextResponse.redirect(new URL("/authorize", req.nextUrl.origin));
  }
  if (req.nextUrl.pathname === "/authorize" && req.auth) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
});

export const config = { matcher: ["/dashboard/:path*", "/authorize"] };
