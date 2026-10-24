import { NextResponse, type NextRequest } from "next/server";
import { isAllowedHost, parseAllowedHosts } from "@/lib/allowed-hosts";

// Read per request so DAILYHUB_ALLOWED_HOSTS set on `docker run` takes effect
// without a rebuild.
export function middleware(request: NextRequest) {
  const allowed = parseAllowedHosts(process.env.DAILYHUB_ALLOWED_HOSTS);
  if (isAllowedHost(request.headers.get("host"), allowed)) {
    return NextResponse.next();
  }

  return new NextResponse(
    "DailyHub refused this hostname. To reach it by this name, add it to DAILYHUB_ALLOWED_HOSTS.\n",
    { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8" } }
  );
}

export const config = {
  runtime: "nodejs",
  matcher: "/:path*",
};
