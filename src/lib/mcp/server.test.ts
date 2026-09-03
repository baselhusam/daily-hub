import { describe, expect, it } from "vitest";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createDailyHubMcpServer } from "./server";

function request(body: object, sessionId?: string) {
  return new Request("http://127.0.0.1:9999/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...(sessionId
        ? {
            "mcp-protocol-version": "2025-11-25",
            "mcp-session-id": sessionId,
          }
        : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("DailyHub MCP server", () => {
  it("advertises its tools after a Streamable HTTP handshake", async () => {
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: () => "test-mcp-session",
      enableJsonResponse: true,
    });
    const server = createDailyHubMcpServer();
    await server.connect(transport);

    const initialize = await transport.handleRequest(
      request({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0.0" },
        },
      })
    );
    expect(initialize.status).toBe(200);
    const sessionId = initialize.headers.get("mcp-session-id");
    expect(sessionId).toBeTruthy();

    const tools = await transport.handleRequest(
      request({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }, sessionId!)
    );
    expect(tools.status).toBe(200);
    const payload = await tools.json();
    expect(payload.result.tools.map((tool: { name: string }) => tool.name)).toEqual(
      expect.arrayContaining([
        "list_projects",
        "list_tasks",
        "list_habits",
        "list_inbox",
        "create_project",
        "create_task",
        "create_habit",
        "get_stats",
      ])
    );
  });
});
