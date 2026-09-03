import { randomUUID, timingSafeEqual } from "node:crypto";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createDailyHubMcpServer } from "@/lib/mcp/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type McpRuntime = {
  transport: WebStandardStreamableHTTPServerTransport;
};

const globalForMcp = globalThis as unknown as {
  dailyHubMcpRuntimes?: Map<string, McpRuntime>;
};

function isAuthorized(request: Request) {
  const token = process.env.DAILYHUB_MCP_TOKEN;
  const supplied = request.headers.get("authorization");
  if (!token || !supplied?.startsWith("Bearer ")) return false;

  const expected = Buffer.from(`Bearer ${token}`);
  const received = Buffer.from(supplied);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function runtimes() {
  if (!globalForMcp.dailyHubMcpRuntimes) {
    globalForMcp.dailyHubMcpRuntimes = new Map();
  }
  return globalForMcp.dailyHubMcpRuntimes;
}

async function createTransport() {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: randomUUID,
    enableJsonResponse: true,
    onsessioninitialized: (sessionId) => {
      runtimes().set(sessionId, { transport });
    },
    onsessionclosed: (sessionId) => {
      runtimes().delete(sessionId);
    },
  });
  const server = createDailyHubMcpServer();
  await server.connect(transport);
  return transport;
}

async function handle(request: Request) {
  if (process.env.DAILYHUB_MCP_ENABLED === "false") {
    return new Response("Not found", { status: 404 });
  }

  if (!isAuthorized(request)) {
    return new Response("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": "Bearer" },
    });
  }

  const sessionId = request.headers.get("mcp-session-id");
  const transport = sessionId
    ? runtimes().get(sessionId)?.transport
    : await createTransport();

  if (!transport) {
    return new Response("Unknown MCP session", { status: 404 });
  }

  return transport.handleRequest(request);
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
