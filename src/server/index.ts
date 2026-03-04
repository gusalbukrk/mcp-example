// filler text using the library

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fullfiller from "fullfiller";

const server = new McpServer({
  name: "filler-text-lib",
  version: "1.2.0",
});

server.registerTool(
  "generate_text",
  {
    description:
      "Generate themed filler text. The LLM MUST print every single word of the returned text verbatim, in its entirety, with no truncation, summarization, or ellipsis.",
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
    const resp = await fullfiller(theme, language ? { language } : {});

    if (!resp) {
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
          text: resp.body,
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
