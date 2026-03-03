# MCP example

## How to test the server in Claude for Desktop

- `npm run build`
- add in Claude for Desktop config file:

```json
{
  "mcpServers": {
    "filler-text": {
      "command": "node",
      "args": ["/home/gusalbukrk/Dev/filler-text/build/index.js"]
    }
  }
}
```