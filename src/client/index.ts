import { GoogleGenAI, Tool } from "@google/genai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import readline from "readline/promises";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

const __dirname = import.meta.dirname;
const logsDir = path.join(__dirname, "..", "..", "logs");

const GEMINI_MODEL = "gemini-2.5-flash";

dotenv.config();

class MCPClient {
  private mcp: Client;
  private ai: GoogleGenAI;
  private transport: StdioClientTransport | null = null;
  private tools: Tool[] = [];
  private chatHistory: any[] = [];

  constructor() {
    // gets the API key from the env variable `GEMINI_API_KEY` automatically
    this.ai = new GoogleGenAI({});
    this.mcp = new Client({ name: "mcp-client-cli", version: "1.0.0" });
  }

  async connectToServer(serverScriptPath: string) {
    try {
      if (!serverScriptPath.endsWith(".js")) {
        throw new Error("Server script must be a .js or .py file");
      }
      const command = process.execPath;

      // e.g. `/usr/bin/node build/server/index.js`
      console.log(`command: ${command} ${serverScriptPath}`);

      this.transport = new StdioClientTransport({
        command,
        args: [serverScriptPath],
      });
      await this.mcp.connect(this.transport);

      const toolsResult = await this.mcp.listTools();

      // Map MCP tools to Gemini's FunctionDeclaration format
      const functionDeclarations = toolsResult.tools.map((tool) => {
        return {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema as any,
        };
      });

      this.tools =
        functionDeclarations.length > 0 ? [{ functionDeclarations }] : [];

      console.log(
        "Connected to server with tools:",
        toolsResult.tools.map(({ name }) => name),
      );
    } catch (e) {
      console.log("Failed to connect to MCP server: ", e);
      throw e;
    }
  }

  async processQuery(query: string) {
    const contents: any[] = [
      {
        role: "user",
        parts: [{ text: query }],
      },
    ];

    const config = {
      tools: this.tools.length > 0 ? this.tools : undefined,
      systemInstruction:
        "You are a helpful and knowledgeable general-purpose assistant. Use your own knowledge to answer question and use the available tool only when asked to generate filler text.",
    };

    const response = await this.ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config,
    });

    const finalText = [];

    // 1. Capture text response if any
    if (response.text) {
      finalText.push(response.text);
    }

    // 2. Handle Tool Calls
    if (response.functionCalls && response.functionCalls.length > 0) {
      // Add the model's function call to the conversation history
      contents.push({
        role: "model",
        parts: response.functionCalls.map((call) => ({ functionCall: call })),
      });

      // Execute each tool call requested by the model
      for (const call of response.functionCalls) {
        const toolName = call.name;
        const toolArgs = call.args as Record<string, unknown>;

        const result = await this.mcp.callTool({
          name: toolName!,
          arguments: toolArgs,
        });

        console.log(
          `[Calling tool ${toolName} with args ${JSON.stringify(toolArgs)}]`,
        );

        // Extract text from MCP result (MCP results are typically arrays of content blocks)
        const resultText = Array.isArray(result.content)
          ? result.content.map((c: any) => c.text || "").join("\n")
          : String(result.content);

        // Add the tool execution result back to the history
        // the role is "user" because from the model's perspective, the tool's output is new information
        // that it didn't have before, similar to how a user would provide new information
        // after the model's initial response.
        contents.push({
          role: "user",
          parts: [
            {
              functionResponse: {
                name: toolName,
                response: { result: resultText },
              },
            },
          ],
        });
      }

      // Send the updated history back to Gemini to get the final summary/answer
      const followUpResponse = await this.ai.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config,
      });

      if (followUpResponse.text) {
        finalText.push(followUpResponse.text);
      }
    }

    this.chatHistory.push([
      ...contents,
      { role: "model", text: finalText.join("\n") },
    ]);

    return finalText.join("\n");
  }

  async chatLoop() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      console.log("\nMCP Client Started!");
      console.log("Type your queries or 'quit' to exit.");

      while (true) {
        const message = await rl.question("\nQuery: ");

        if (message.toLowerCase() === "quit") break;

        const response = await this.processQuery(message);
        console.log("\n" + response);
      }
    } finally {
      // write chat history to file
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      fs.writeFileSync(
        path.join(logsDir, `${timestamp}.json`),
        JSON.stringify(this.chatHistory, null, 2),
      );

      rl.close();
    }
  }

  async cleanup() {
    await this.mcp.close();
  }
}

async function main() {
  if (process.argv.length < 3) {
    console.log("Usage: npx tsx index.ts <path_to_server_script>");
    return;
  }

  const mcpClient = new MCPClient();

  try {
    await mcpClient.connectToServer(process.argv[2]);
    await mcpClient.chatLoop();
  } catch (e) {
    console.error("Error:", e);
    await mcpClient.cleanup();
    process.exit(1);
  } finally {
    await mcpClient.cleanup();
    process.exit(0);
  }
}

main();
