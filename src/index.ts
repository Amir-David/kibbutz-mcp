#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer, IncomingMessage } from 'http';
import { z } from 'zod';
import type { AddressInfo } from 'net';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

let mcpSocket: WebSocket | null = null;
let pingSocket: WebSocket | null = null;
let token: string | null = null;
let port: number | null = null;
let wsPromise: (() => void) | null = null;
const map = new Map<string, Pending>();
const server = new McpServer({
    name: 'kibbutz-mcp',
    version: '1.1.1',
});

type ToolTextResponse = {
    content: { type: 'text'; text: string }[];
    isError: boolean;
};

type Pending = {
    resolve: (value: string) => void;
    reject: (reason?: any) => void;
};

function findChromeExecutable() {
    const platform = process.platform;

    if (platform === 'linux') {
        return '/opt/google/chrome/chrome';
    }

    if (platform === 'darwin') {
        return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    }

    if (platform === 'win32') {
        const suffix = '\\Google\\Chrome\\Application\\chrome.exe';
        const bases = [
            process.env.LOCALAPPDATA,
            process.env.PROGRAMFILES,
            process.env['PROGRAMFILES(X86)'],
            process.env.HOMEDRIVE && path.join(process.env.HOMEDRIVE, 'Program Files'),
            process.env.HOMEDRIVE && path.join(process.env.HOMEDRIVE, 'Program Files (x86)'),
        ].filter(Boolean);

        for (const base of bases) {
            const candidate = path.join(base as string, suffix);
            if (fs.existsSync(candidate)) {
                return candidate;
            }
        }
    }

    throw new Error(`Chrome executable not found for platform: ${platform}`);
}

function openChromeWithExtension(wsPort: number) {
    const executablePath = findChromeExecutable();

    const url = new URL('chrome-extension://bpfjmggaaiigpfahhmpmacfhlemnhhip/kibbutz-mcp.html');
    token = uuidv4();

    url.searchParams.set('wsPort', String(wsPort));
    url.searchParams.set('token', token);

    const child = spawn(executablePath, [url.toString()], {
        detached: true,
        windowsHide: true,
        shell: false,
        stdio: 'ignore',
    });

    child.unref();
}

const sendAndWaitForReply = async (message: string, args: any): Promise<ToolTextResponse> => {
    if (!token) {
        try {
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    wsPromise = null;
                    reject(new Error('Timeout waiting for MCP extension WebSocket connection'));
                }, 2000);

                wsPromise = () => {
                    clearTimeout(timeout);
                    resolve();
                };

                openChromeWithExtension(port as number);
            });
        } catch (error) {}
    }

    if (
        !mcpSocket ||
        !pingSocket ||
        mcpSocket.readyState !== WebSocket.OPEN ||
        pingSocket.readyState !== WebSocket.OPEN
    ) {
        return Promise.resolve({
            content: [
                {
                    type: 'text',
                    text: `Connection failed: The MCP server cannot reach the Chrome extension. Open chrome-extension://bpfjmggaaiigpfahhmpmacfhlemnhhip/KIBBUTZ-MCP.html for troubleshooting.`,
                },
            ],
            isError: true,
        });
    }

    return new Promise((resolve, reject) => {
        const id = uuidv4();
        map.set(id, {
            resolve: (result: string) => {
                resolve({
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                    isError: false,
                });
            },
            reject,
        });

        mcpSocket?.send(
            JSON.stringify({
                id,
                message,
                args,
            })
        );
    });
};

server.registerTool(
    'SNAPSHOT_MCP',
    {
        title: 'Get window snapshot',
        description:
            'Get the current window tabs organized as a nested tree structure. Returns groups and their child tabs, along with standalone tabs, titles, and URLs.',
    },
    (args) => sendAndWaitForReply('SNAPSHOT_MCP', args)
);

server.registerTool(
    'CLOSE_GROUPS_MCP',
    {
        title: 'Close groups',
        description: 'Close specific browser groups and all their contained tabs.',
        inputSchema: {
            groupIds: z
                .array(z.number())
                .min(1)
                .describe('List of group identifiers (integers) to close.'),
        },
    },
    (args) => sendAndWaitForReply('CLOSE_GROUPS_MCP', args)
);

server.registerTool(
    'UNGROUPS_MCP',
    {
        title: 'Ungroup groups',
        description:
            'Ungroup specific browser groups using their group IDs. The tabs will become standalone.',
        inputSchema: {
            groupIds: z
                .array(z.number())
                .min(1)
                .describe('List of group identifiers (integers) to ungroup.'),
        },
    },
    (args) => sendAndWaitForReply('UNGROUPS_MCP', args)
);

server.registerTool(
    'CLOSE_TABS_MCP',
    {
        title: 'Close tabs',
        description: 'Close specific browser tabs using their unique IDs.',
        inputSchema: {
            tabIds: z
                .array(z.number())
                .min(1)
                .describe('List of specific tab identifiers (integers) to close.'),
        },
    },
    (args) => sendAndWaitForReply('CLOSE_TABS_MCP', args)
);

server.registerTool(
    'PIN_TABS_MCP',
    {
        title: 'Pin tabs',
        description: 'Pin specific browser tabs using their unique IDs.',
        inputSchema: {
            tabIds: z
                .array(z.number())
                .min(1)
                .describe('List of specific tab identifiers (integers) to pin.'),
        },
    },
    (args) => sendAndWaitForReply('PIN_TABS_MCP', args)
);

server.registerTool(
    'UNPIN_TABS_MCP',
    {
        title: 'Unpin tabs',
        description: 'Unpin specific browser tabs using their unique IDs.',
        inputSchema: {
            tabIds: z
                .array(z.number())
                .min(1)
                .describe('List of specific tab identifiers (integers) to unpin.'),
        },
    },
    (args) => sendAndWaitForReply('UNPIN_TABS_MCP', args)
);

server.registerTool(
    'UNGROUP_TABS_MCP',
    {
        title: 'Ungroup tabs',
        description:
            'Remove specific tabs from their assigned groups using their tab IDs. The tabs will become standalone.',
        inputSchema: {
            tabIds: z
                .array(z.number())
                .min(1)
                .describe(
                    'List of specific tab identifiers (integers) to remove from their groups.'
                ),
        },
    },
    (args) => sendAndWaitForReply('UNGROUP_TABS_MCP', args)
);

server.registerTool(
    'ADD_TO_GROUP_MCP',
    {
        title: 'Add tabs to group',
        description: 'Move specific tabs into an existing browser group.',
        inputSchema: {
            tabIds: z
                .array(z.number())
                .min(1)
                .describe('List of tab IDs to move into the target group.'),
            groupId: z
                .number()
                .describe('The integer ID of an existing group to move the tabs into.'),
        },
    },
    (args) => sendAndWaitForReply('ADD_TO_GROUP_MCP', args)
);

server.registerTool(
    'MOVE_GROUP_MCP',
    {
        title: 'Move group',
        description: 'Reposition a browser group to a new index.',
        inputSchema: {
            groupId: z.number().describe('The ID of the group to move.'),
            index: z
                .number()
                .describe('The new position index. Use 0 for the start, -1 for the end.'),
        },
    },
    (args) => sendAndWaitForReply('MOVE_GROUP_MCP', args)
);

server.registerTool(
    'MOVE_TABS_MCP',
    {
        title: 'Move tabs',
        description:
            'Move one or more tabs to a specific index position. Multiple tabs will be placed contiguously starting at the target index.',
        inputSchema: {
            tabIds: z.array(z.number()).min(1).describe('List of tab IDs to move.'),
            index: z
                .number()
                .describe('The new position index. Use 0 for the start, -1 for the end.'),
        },
    },
    (args) => sendAndWaitForReply('MOVE_TABS_MCP', args)
);

server.registerTool(
    'ADD_TO_NEW_GROUP_MCP',
    {
        title: 'Create group',
        description: 'Create a new browser group from a list of tabs, with a title and color.',
        inputSchema: {
            tabIds: z
                .array(z.number())
                .min(1)
                .describe('List of tab IDs to group together into the new group.'),
            title: z.string().describe('The title of the new group'),
            color: z
                .enum([
                    'grey',
                    'blue',
                    'red',
                    'yellow',
                    'green',
                    'pink',
                    'purple',
                    'cyan',
                    'orange',
                ])
                .describe(
                    'The color of the new group. Must be one of the supported Chrome colors.'
                ),
        },
    },
    (args) => sendAndWaitForReply('ADD_TO_NEW_GROUP_MCP', args)
);

server.registerTool(
    'UPDATE_GROUP_MCP',
    {
        title: 'Update group',
        description:
            'Update the title or color of an existing browser group. At least one property (title or color) should be provided.',
        inputSchema: {
            groupId: z.number().describe('The ID of the group to update'),
            title: z
                .string()
                .optional()
                .describe('The new title. Leave undefined to keep the current title.'),
            color: z
                .enum([
                    'grey',
                    'blue',
                    'red',
                    'yellow',
                    'green',
                    'pink',
                    'purple',
                    'cyan',
                    'orange',
                ])
                .optional()
                .describe('The new color. Leave undefined to keep the current color.'),
        },
    },
    (args) => sendAndWaitForReply('UPDATE_GROUP_MCP', args)
);

async function main() {
    const httpServer = createServer();
    const wss = new WebSocketServer({ noServer: true });
    const wssMcp = new WebSocketServer({ noServer: true });

    wss.on('connection', (ws: WebSocket) => {
        pingSocket = ws;
        ws.on('error', console.error);

        ws.on('close', () => {
            if (pingSocket === ws) {
                pingSocket = null;
                if (mcpSocket) {
                    wssMcp.clients.forEach((ws) => ws.terminate());
                    mcpSocket = null;
                }
                for (const { reject } of map.values()) {
                    reject(new Error('Extension WebSocket closed'));
                }
                map.clear();
            }
        });
    });

    wssMcp.on('connection', (ws: WebSocket) => {
        mcpSocket = ws;
        if (wsPromise) {
            wsPromise();
            wsPromise = null;
        }
        ws.on('error', console.error);

        ws.on('close', () => {
            if (mcpSocket === ws) {
                mcpSocket = null;
            }
            for (const { reject } of map.values()) {
                reject(new Error('Extension WebSocket closed'));
            }
            map.clear();
        });

        ws.on('message', (data: WebSocket.RawData) => {
            const text = data.toString();

            const response = JSON.parse(text);

            if (response.id && map.has(response.id)) {
                const pending = map.get(response.id)!;
                pending.resolve(response.result);
                map.delete(response.id);
            }
        });
    });

    httpServer.on('upgrade', (request: IncomingMessage, socket, head) => {
        const { pathname } = new URL(request.url || '', `wss:127.0.0.1:${port}`);

        if (pathname === '/ping') {
            if (request.headers['sec-websocket-protocol'] !== token) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }
            wss.clients.forEach((ws) => ws.terminate());
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request);
            });
        } else if (pathname === '/mcp') {
            if (pingSocket?.readyState !== WebSocket.OPEN) {
                socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
                socket.destroy();
                return;
            }
            wssMcp.clients.forEach((ws) => ws.terminate());
            wssMcp.handleUpgrade(request, socket, head, (ws) => {
                wssMcp.emit('connection', ws, request);
            });
        } else {
            socket.destroy();
        }
    });

    httpServer.listen(0, () => {
        port = (httpServer.address() as AddressInfo).port;
    });
    const transport = new StdioServerTransport();
    await server.connect(transport);

    process.stdin.on('end', () => {
        wss.clients.forEach((ws) => ws.terminate());
        wssMcp.clients.forEach((ws) => ws.terminate());
    });
    process.on('SIGTERM', () => {
        wss.clients.forEach((ws) => ws.terminate());
        wssMcp.clients.forEach((ws) => ws.terminate());
    });
}

main().catch(() => {
    process.exit(1);
});
