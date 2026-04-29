import { z } from "zod";
import "dotenv/config";
import { readdir } from "fs/promises";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const ALLOWED_FOLDER = process.env.ALLOWED_FOLDER;
if (!ALLOWED_FOLDER) {
    console.error("ALLOWED_FOLDER environment variable is not set.");
    process.exit(1);
}

const server = new McpServer({
    name: "File-reader",
    version: "1.0.0"
});

server.tool(
    "list_files",
    "List all the files from the ALLOWED_FOLDER",
    { },
    async () => {
        try {
            const entries = await readdir(ALLOWED_FOLDER, { withFileTypes: true });
            const files = entries
                .filter((e) => e.isFile())
                .map((e) => e.name);

            if (files.length === 0) {
                return {
                    content: [{ type: "text", text: "The folder is empty." }],
                };
            }

            return {
                content: [{
                        type: "text",
                        text: `Found ${files.length} file(s):\n\n${files.join("\n")}`,
                    },
                ],
            };
        } catch (error: any) {
            return {
                content: [{ type: "text", text: `Could not read the folder: ${error.message}` }],
                isError: true 
            };
        }
    }
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("File-reader MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});