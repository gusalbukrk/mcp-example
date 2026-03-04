// filler text using the API at https://fullfiller.gusalbukrk.com/

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE = "https://fullfiller.gusalbukrk.com/api";

const server = new McpServer({
  name: "filler-text-api",
  version: "1.2.0",
});

async function makeAPIRequest<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error("Error making request:", error);
    return null;
  }
}

interface APIResponse {
  title: string;
  body: string;
}

server.registerTool(
  "generate_text",
  {
    description: "Generate themed filler text.",
    inputSchema: {
      theme: z.string().describe("theme"),
      language: z
        .string()
        .optional()
        .describe(
          "Language acronym (e.g. 'en' for English, 'pt' for Portuguese). Always use the ISO 639-1 two-letter code.",
        ),
    },
  },
  async ({ theme, language }) => {
    const url = `${API_BASE}/?query=${theme}${language ? `&language=${language}` : ""}`;
    const response = await makeAPIRequest<APIResponse>(url);

    if (!response) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to generate filler text",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `${response.title}\n\n${response.body}`,
        },
      ],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Filler Text MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
