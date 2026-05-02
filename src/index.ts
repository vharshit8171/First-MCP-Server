import { z } from "zod";
import "dotenv/config";
import { readdir, readFile, rename, stat, unlink, writeFile } from "fs/promises";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { join } from "path";

const ALLOWED_FOLDER = process.env.ALLOWED_FOLDER;
if (!ALLOWED_FOLDER) {
    console.error("ALLOWED_FOLDER environment variable is not set.");
    process.exit(1);
}

const server = new McpServer({
    name: "File-reader",
    version: "1.0.0"
});


/**
 * Resource to provide an index of files in the allowed folder.
 * Retrieves a list of all files (not directories) from the ALLOWED_FOLDER environment variable path.
 * @param {URL} uri - The URI for the resource request.
 * @returns {Object} An object with contents array containing the file list or an error message.
 */
server.resource(
    "folder-index",
    "ALLOWED_FOLDER",
    async (uri) => {
        try {
            const entries = await readdir(ALLOWED_FOLDER, { withFileTypes: true });
            const files = entries.filter((e) => e.isFile()).map((e) => e.name);
            const indexText =
                files.length > 0
                    ? `Files currently in the folder (${files.length} total):\n\n${files.join("\n")}`
                    : "The folder is currently empty.";
            return {
                contents: [{ uri: uri.href, mimeType: "text/plain", text: indexText }],
            };
        } catch {
            return {
                contents: [{ uri: uri.href, mimeType: "text/plain", text: "Could not read folder index." }],
            };
        }
    }
);


/**
 * Resource to read the contents of a specific file by name.
 * Reads the entire content of the specified file from the ALLOWED_FOLDER.
 * @param {URL} uri - The URI containing the filename in the pathname.
 * @returns {Object} An object with contents array containing the file contents or an error message.
 */
server.resource(
    "file://{filename}",
    "Read contents of a file by name",
    async (uri: URL) => {
        const filename = uri.pathname.slice(1);
        try {
            const content = await readFile(join(ALLOWED_FOLDER, filename), "utf-8");

            return {
                contents: [{
                    uri: `file://${filename}`,
                    text: content || "File is empty"
                }]
            };
        } catch (error: any) {
            return {
                contents: [{
                    uri: `file://${filename}`,
                    text: `Error reading file: ${error.message}`
                }]
            };
        }
    }
);


/**
 * Prompt to summarize a file in bullet points with action items.
 * Reads the specified file and generates a summary in clear bullet points (maximum 6) plus any identified action items or tasks.
 * @param {string} filename - The name of the file to summarize, e.g. notes.txt.
 * @returns {Object} An object with messages array containing the prompt for summarization or an error message.
 */
server.prompt(
    "summarise-file",
    "Read a file and summarise it in bullet points with action items",
    {
        filename: z.string().describe("Name of the file to summarise, e.g. notes.txt"),
    },
    async ({ filename }) => {
        try {
            const content = await readFile(join(ALLOWED_FOLDER, filename), "utf-8");
            return {
                messages: [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `Please read the following file and do two things:

1. Summarise the content in clear bullet points (maximum 6 bullets)
2. List any action items or tasks you can identify
Keep the tone professional and concise.
File name: ${filename}
File content: ${content}`,
                    },
                },],
            };
        } catch {
            return {
                messages: [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `Could not read "${filename}" for summarisation. Does the file exist?`,
                    },
                },],
            };
        }
    }
);


/**
 * Prompt to review a file based on the specified review type.
 * Reads the specified file and provides a detailed review focusing on grammar, clarity, structure, or code quality.
 * @param {string} filename - The name of the file to review, e.g. plan.txt.
 * @param {string} review_type - The type of review: grammar, clarity, structure, or code.
 * @returns {Object} An object with messages array containing the prompt for review or an error message.
 */
server.prompt(
    "review-file",
    "Read a file and give a detailed review based on the review type",
    {
        filename: z.string().describe("Name of the file to review, e.g. plan.txt"),
        review_type: z
            .enum(["grammar", "clarity", "structure", "code"])
            .describe("Type of review: grammar, clarity, structure, or code"),
    },
    async ({ filename, review_type }) => {
        try {
            const content = await readFile(join(ALLOWED_FOLDER, filename), "utf-8");
            const instructions: Record<string, string> = {
                grammar:
                    "Review the following text for grammar, spelling, and punctuation mistakes. List every issue you find with the line or sentence it appears in, and suggest a correction for each.",
                clarity:
                    "Review the following text for clarity and readability. Identify sentences that are confusing or hard to understand, explain why, and suggest a clearer version.",
                structure:
                    "Review the following text for structure and organisation. Comment on how well the ideas flow, whether headings and sections make sense, and suggest improvements.",
                code:
                    "Review the following code. Check for bugs, poor naming, missing error handling, performance issues, and style problems. List each issue with the line number if possible and suggest a fix.",
            };
            return {
                messages: [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `${instructions[review_type]}
File name: ${filename}
Content:${content}`,
                    },
                },
                ],
            };
        } catch {
            return {
                messages: [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `Could not read "${filename}" for review. Does the file exist?`,
                    },
                },
                ],
            };
        }
    }
);


/**
 * Tool to list all files in the allowed folder.
 * Retrieves a list of all files (not directories) from the ALLOWED_FOLDER environment variable path.
 * @returns {Object} An object with content array containing either the list of files or an error message.
 */
server.tool(
    "list_files",
    "List all the files from the ALLOWED_FOLDER",
    {},
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


/**
 * Tool to read the content of a specific file.
 * Reads the entire content of the specified file from the ALLOWED_FOLDER.
 * @param {string} filename - The name of the file to read.
 * @returns {Object} An object with content array containing the file contents or an error message.
 */
server.tool(
    "read-files",
    "Reads the content of the given specific file",
    {
        filename: z.string().describe("File whose content have to read")
    },
    async ({ filename }) => {
        try {
            const content = await readFile(join(ALLOWED_FOLDER, filename), "utf-8")
            if (!content) {
                return {
                    content: [{ type: "text", text: "The file is empty." }],
                }
            }
            return {
                content: [{ type: "text", text: `Contents of "${filename}":\n\n${content}` }],
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `Could not read "${filename}". Does it exist?` }],
            }
        }
    }
);


/**
 * Tool to create a new file or overwrite an existing file.
 * Writes the provided content to the specified file in the ALLOWED_FOLDER. If the file exists, it will be overwritten.
 * @param {string} fileName - The name of the file to create or overwrite.
 * @param {string} content - The content to write into the file.
 * @returns {Object} An object with content array containing a success message or an error message.
 */
server.tool(
    "write-file",
    "Create new files or overwrites the content of existing file ",
    {
        fileName: z.string().describe("Name of the file to create or overwrite"),
        content: z.string().describe("The information tobe write inside the file")
    },
    async ({ fileName, content }) => {
        try {
            await writeFile(join(ALLOWED_FOLDER, fileName), content, "utf-8");
            return {
                content: [{ type: "text", text: `Successfully wrote in ${fileName} ` }]
            }
        } catch (error) {
            return {
                content: [{ type: "text", text: `Could not wrote to ${fileName}` }]
            }
        }
    }
);


/**
 * Tool to rename an existing file to a new name.
 * Renames the specified file from old_name to new_name within the ALLOWED_FOLDER. Checks for file existence before renaming.
 * @param {string} old_name - The current name of the file to rename.
 * @param {string} new_name - The new name for the file.
 * @returns {Object} An object with content array containing a success message, file not found message, or an error message.
 */
server.tool(
    "rename_file",
    "Rename an existing file to a new name",
    {
        old_name: z.string().describe("Current name of the file"),
        new_name: z.string().describe("New name for the file"),
    },
    async ({ old_name, new_name }) => {
        try {
            await rename(join(ALLOWED_FOLDER, old_name), join(ALLOWED_FOLDER, new_name));
            return { content: [{ type: "text", text: `Renamed "${old_name}" to "${new_name}".` }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Could not rename "${old_name}". Does it exist?` }] };
        }
    }
);


/**
 * Tool to get file information and metadata.
 * Retrieves detailed information about a file including its size (in KB and bytes), file type/extension, and last modified date.
 * @param {string} filename - The name of the file to inspect.
 * @returns {Object} An object with content array containing file metadata or an error message.
 */
server.tool(
    "file_info",
    "Get size, type and last modified date of a file",
    {
        filename: z.string().describe("Name of the file to inspect"),
    },
    async ({ filename }) => {
        try {
            const info = await stat(join(ALLOWED_FOLDER, filename));
            const sizeKB = (info.size / 1024).toFixed(2);
            const extension = filename.includes(".")
                ? filename.split(".").pop()?.toUpperCase()
                : "No extension";
            return {
                content: [{
                    type: "text",
                    text: [
                        `File:          ${filename}`,
                        `Size:          ${sizeKB} KB (${info.size} bytes)`,
                        `Type:          ${extension}`,
                        `Last modified: ${info.mtime.toLocaleString()}`,
                    ].join("\n"),
                }],
            };
        } catch {
            return { content: [{ type: "text", text: `Could not get info for "${filename}". Does it exist?` }] };
        }
    }
);


/**
 * Tool to permanently delete a file from the allowed folder.
 * Deletes the specified file if it exists in the ALLOWED_FOLDER. Checks for file existence before deletion.
 * @param {string} fileName - The name of the file to delete.
 * @returns {Object} An object with content array containing a success message, file not found message, or an error message.
 */
server.tool(
    "delete-file",
    "Permanently deltes the given file name from the allowed folder",
    {
        fileName: z.string().describe("Name of the name that have to delete"),
    },
    async ({ fileName }) => {
        try {
            const files = await readdir(ALLOWED_FOLDER, {
                withFileTypes: true
            });
            const nameOfFiles = files
                .filter((e) => e.isFile())
                .map((e) => e.name);

            for (const name of nameOfFiles) {
                if (name === fileName) {
                    await unlink(join(ALLOWED_FOLDER, fileName));
                    return {
                        content: [{ type: "text", text: `Successfully deleted ${fileName} ` }]
                    }
                }
            }
            return {
                content: [{ type: "text", text: `No such file exists: ${fileName}` }]
            }

        } catch (error) {
            return {
                content: [{ type: "text", text: `Could not delete ${fileName}` }]
            }
        }
    }
);


/**
 * Tool to display all available capabilities of the MCP server.
 * Shows a formatted list of all available tools, resources, and prompts with their descriptions and usage information.
 * @returns {Object} An object with content array containing a formatted display of all server capabilities.
 */
server.tool(
    "list_tools",
    "Show all available tools, resources and prompts with full details",
    {},
    async () => {
        const text = `
╔══════════════════════════════════════════╗
  FILE READER MCP SERVER — CAPABILITIES
╚══════════════════════════════════════════╝
 
TOOLS (actions Claude can perform)
───────────────────────────────────
1. list_files
   What:   Lists all files in the folder
   Inputs: none
 
2. read_file
   What:   Reads full contents of a file
   Inputs: filename (string)
 
3. write_file
   What:   Creates or overwrites a file
   Inputs: filename (string), content (string)
 
4. delete_file
   What:   Permanently deletes a file
   Inputs: filename (string)
 
5. file_info
   What:   Gets size, type and modified date
   Inputs: filename (string)

6. rename_file
    What: Rename the files name
    Inputs: oldFileName (string), newFileName (string)
 
RESOURCES (data always available as context)
─────────────────────────────────────────────
• folder://index
  What: Live list of all files in the folder
 

PROMPTS (saved instruction templates)
───────────────────────────────────────
• summarise-file
  What:   Summarises a file in bullets + action items
  Inputs: filename (string)
 
• review-file
  What:   Reviews a file in detail
  Inputs: filename (string)
          review_type (grammar | clarity | structure | code)
    `.trim();
        return { content: [{ type: "text", text }] };
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