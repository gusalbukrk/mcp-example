import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CreateMessageRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import OpenAI from "openai";

const dir = (input: unknown, prepend?: string) => {
  if (prepend !== undefined) process.stdout.write(prepend + " ");
  console.dir(input, { depth: null });
};

const openai = new OpenAI({
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  apiKey: process.env["GEMINI_API_KEY"], // This is the default and can be omitted
});

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
dir(prompts);
//
const prompt = await client.getPrompt({
  name: "review-code",
  arguments: {
    code: "const x = 10; dir('x');",
  },
});
dir(prompt);
//
// send this string to the AI API
// or the entire prompts.messages to a chat endpoint such as `https://api.openai.com/v1/chat/completions`
dir(prompt.messages[0].content.text);

// EXAMPLE: resource
// const resources = await client.listResources(); // list static resources
const resources = await client.listResourceTemplates(); // list dynamic resources
dir(resources);
//
const resource = await client.readResource({
  uri: "greeting://Gustavo",
});
dir(resource);

// EXAMPLE: tool
const tools = await client.listTools();
dir(tools);
//
const addResult = await client.callTool({
  name: "add",
  arguments: {
    a: 27,
    b: 3,
  },
});
dir(addResult);

// EXAMPLE: sampling
// two step: configure with `setRequestHandler` and then call the sampling with `callTool()`
// using AI API so demo is closer to real-world use
client.setRequestHandler(CreateMessageRequestSchema, async (request) => {
  dir(request);

  const response = await openai.chat.completions.create({
    model: "gemini-2.0-flash-lite",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      {
        role: "user",
        content: request.params.messages[0].content.text as string,
      },
    ],

    // optional
    response_format: { type: "json_object" },
  });
  dir(response, "RESPONSE:");

  // return object must have all of this 4 properties
  return {
    role: response.choices[0].message.role, // "user" | "assistant"
    model: response.model,

    // this object will be the return when calling the sampling
    content: {
      type: "text", // "text" | "image" | "audio"
      // text: texts.join("\n"),
      text: response.choices[0].message.content,
    },
  };
});
//
const samplingResult = await client.callTool({
  name: "generate-fake",
  arguments: {
    text: "Generate an array containing 5 objects with the following data about a Brazilian person name, city, phone_number",
  },
});
dir(JSON.parse((samplingResult.content as { text: string }[])[0].text));
