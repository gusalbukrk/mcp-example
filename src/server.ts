import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "demo-server",
  version: "1.0.0",
});

// EXAMPLE: resource
// (more specifically, example of a dynamic resource with parameters)
server.registerResource(
  "greeting",
  new ResourceTemplate("greeting://{name}", { list: undefined }),
  {
    title: "Greeting Resource", // Display name for UI
    description: "Dynamic greeting generator",
  },
  async (uri, { name }) => ({
    contents: [
      {
        uri: uri.href,
        text: `Hello, ${name}!`,
      },
    ],
  })
);

// EXAMPLE: tool
server.registerTool(
  "add",
  {
    title: "Addition Tool",
    description: "Add two numbers",
    inputSchema: { a: z.number(), b: z.number() },
  },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }],
  })
);

// EXAMPLE: prompt
server.registerPrompt(
  "review-code",
  {
    title: "Code Review",
    description: "Review code for best practices and potential issues",
    argsSchema: { code: z.string() },
  },
  ({ code }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Please review this code:\n\n${code}`,
        },
      },
    ],
  })
);

// EXAMPLE: sampling
server.registerTool(
  "generate-fake",
  {
    description: "Generate fake data using LLM.",
    inputSchema: {
      text: z.string().describe("What type of data you want to generate?"),
    },
  },
  async ({ text }) => {
    // call the LLM through MCP sampling
    const response = await server.server.createMessage({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Generate a JSON containing fake data with the given requirements. Return only the raw JSON without markdown formatting or or code blocks. Requirements: \n\n${text}`,
          },
        },
      ],
      maxTokens: 500,
    });

    return {
      content: [
        {
          type: "text",
          text:
            response.content.type === "text"
              ? response.content.text
              : "Unable to generate fake data",
        },
      ],
    };
  }
);

// start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
