import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CreateMessageRequestSchema } from "@modelcontextprotocol/sdk/types.js";

console.log = (input) => {
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

await client.connect(transport);

// EXAMPLE: prompt
const prompts = await client.listPrompts();
console.log(prompts);
//
const prompt = await client.getPrompt({
  name: "review-code",
  arguments: {
    code: "const x = 10; console.log('x');",
  },
});
console.log(prompt);
//
// send this string to the AI API
// or the entire prompts.messages to a chat endpoint such as `https://api.openai.com/v1/chat/completions`
console.log(prompt.messages[0].content.text);

// EXAMPLE: resource
// const resources = await client.listResources(); // list static resources
const resources = await client.listResourceTemplates(); // list dynamic resources
console.log(resources);
//
const resource = await client.readResource({
  uri: "greeting://Gustavo",
});
console.log(resource);

// EXAMPLE: tool
const tools = await client.listTools();
console.log(tools);
//
const addResult = await client.callTool({
  name: "add",
  arguments: {
    a: 27,
    b: 3,
  },
});
console.log(addResult);
