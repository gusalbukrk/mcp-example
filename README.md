# MCP example

## MCP server

### How to test the server in Claude for Desktop

- `npm run build`
- add in Claude for Desktop config file:

```json
{
  "mcpServers": {
    "filler-text": {
      "command": "node",
      "args": ["/home/gusalbukrk/Dev/mcp-example/build/server/index.js"]
    }
  }
}
```

## MCP client

- run `node build/client/index.js build/server/index.js`

## TypeScript note

This project includes `src/types/fullfiller.d.ts` as a temporary type shim for the `fullfiller` package.

Reason: the package currently publishes `dist/index.d.ts`, but its `package.json` `exports` does not expose types in a way TypeScript can resolve under this project's `Node16` module resolution settings.

When `fullfiller` exports types correctly, this shim can be removed.