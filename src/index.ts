import app from "./app";
import { McpAgent } from "agents/mcp";
import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { endpoints, executeHandler, init, server } from "todo-ninja-mcp/server";
import TodoNinjaClient from "todo-ninja";
import { ClientOptions } from "todo-ninja/client";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

export class MyMCP extends McpAgent {
  server = server;

  async init() {

    const endpointMap = Object.fromEntries(
      endpoints.map((endpoint) => [endpoint.tool.name, endpoint])
    );

    server.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: endpoints.map((endpoint) => endpoint.tool),
      };
    });

    server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const clientOptions = this.props.clientProps as ClientOptions;
      const client = new TodoNinjaClient(clientOptions);
      const { name, arguments: args } = request.params;
      const endpoint = endpointMap[name];
      if (!endpoint) {
        throw new Error(`Unknown tool: ${name}`);
      }

      return executeHandler(endpoint.tool, endpoint.handler, client, args);
    });
  }
}

// Export the OAuth handler as the default
export default new OAuthProvider({
  apiRoute: "/sse",
  // TODO: fix these types
  // @ts-ignore
  apiHandler: MyMCP.mount("/sse"),
  // @ts-ignore
  defaultHandler: app,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});
