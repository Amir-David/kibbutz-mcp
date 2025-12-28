
# Kibbutz MCP - Tab & Group Manager

Make browser management simple - on your own or with your LLM MCP client

[![NPM Version](https://img.shields.io/npm/v/kibbutz-mcp?style=flat&logo=npm)](https://www.npmjs.com/package/kibbutz-mcp)

![Kibbutz MCP](media/kibbutzmcp.gif)

[![YouTube Video Views](https://img.shields.io/youtube/views/L4xORTRshzk?style=flat&logo=youtube)](https://youtu.be/L4xORTRshzk)

## Installation Steps

### Requirements
- Node.js 18 or newer
- VS Code, Cursor, Claude Desktop, or any other MCP client.
- Chrome, Chromium, or any other Chromium-based browser (for the browser extension).

### Install the MCP Server
Install the KIBBUTZ-MCP server in your MCP client using the following standard configuration (works in most tools):

```js
{
    "mcpServers": {
        "kibbutz-mcp": {
            "command": "npx",
            "args": [
                "kibbutz-mcp@latest"
            ]
        }
    }
}
```

[![Install Server in VS Code](https://img.shields.io/badge/VS_Code-VS_Code?style=flat&label=Install%20Server&color=0098FF)](https://insiders.vscode.dev/redirect?url=vscode%3Amcp%2Finstall%3F%257B%2522name%2522%253A%2522kibbutz-mcp%2522%252C%2522command%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522kibbutz-mcp%2540latest%2522%255D%257D)

### Download the Extension

Download the latest Chrome extension from the Chrome Web Store:
- **Download link**: https://chromewebstore.google.com/detail/dhgiopilpcmeepmlbafkmenddhgdgfhk

[![Chrome Web Store Version](https://img.shields.io/chrome-web-store/v/dhgiopilpcmeepmlbafkmenddhgdgfhk?style=flat&logo=google-chrome)](https://chromewebstore.google.com/detail/dhgiopilpcmeepmlbafkmenddhgdgfhk)

## Key Features

- ⚡️ Manage tabs and tab groups efficiently with a vertical tabs panel.

- 🗂️ Reorder tabs and tab groups using intuitive drag-and-drop.

- 💾 Save selected tab groups to Shortcuts for fast opening in the future.

- 🤖 Share browser tabs and tab groups with the Kibbutz MCP server.

- 🔍 Quickly search across tabs and tab groups.

- 🌙 Dark Mode support.

## Tools

Grants your MCP client access to **view, create, close, ungroup, pin, move, and customize** selected tabs and tab groups.
