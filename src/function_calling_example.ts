// this file demonstrates the use of function calling in a MCP client
// https://platform.openai.com/docs/guides/function-calling?lang=javascript
//
// NOTE: it is easier to do this using Vercel AI SDK
// as exemplified here https://github.com/WebDevSimplified/mcp-server-and-client/blob/main/src/client.ts

// ========= START OF BOILERPLATE

import OpenAI from "openai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const openai = new OpenAI({
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  apiKey: process.env["GEMINI_API_KEY"],
});

const dir = (input: unknown, prepend?: string) => {
  if (prepend !== undefined) process.stdout.write(prepend + " ");
  console.dir(input, { depth: null });
};

const transport = new StdioClientTransport({
  command: "vite-node",
  args: ["src/server.ts"],
});

const client = new Client(
  {
    name: "example-client",
    version: "1.0.0",
  },
  {
    capabilities: {
      sampling: {},
    },
  }
);

// ========= END OF BOILERPLATE

await client.connect(transport);

const { tools } = await client.listTools();

const response = await openai.chat.completions.create({
  model: "gemini-2.0-flash-lite",
  messages: [
    {
      role: "user",
      content: "Add 21 + 6",
    },
  ],
  tools: tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      parameters: tool.inputSchema,
    },
  })),
});

dir(response);

if (response.choices[0].finish_reason == "tool_calls") {
  for (const toolCall of response.choices[0].message.tool_calls ?? []) {
    if (toolCall.type !== "function") continue;

    const name = toolCall.function.name;
    const args = JSON.parse(toolCall.function.arguments);

    const addResult = await client.callTool({
      name,
      arguments: args,
    });
    dir(addResult);
  }
}
