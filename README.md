# 📂 File Reader MCP Server

A simple **Model Context Protocol (MCP)** server built with **TypeScript** that allows AI clients (like Claude Desktop) to interact with your local file system in a controlled way.

---

## 🚀 Features

* 📄 List all files from a specified folder
* 🔒 Secure access using environment-based configuration
* ⚡ Built with MCP SDK for seamless AI tool integration
* 🧩 Easy to extend with more file operations

---

## 🛠️ Tech Stack

* Node.js
* TypeScript
* MCP SDK (`@modelcontextprotocol/sdk`)

---

## 📁 Project Structure

```
FileReader_MCP/
│
├── src/                # TypeScript source code
├── build/              # Compiled JavaScript (after build)
├── package.json
├── tsconfig.json
├── README.md
├── .env.example
└── .gitignore
```

---

## ⚙️ Setup

### 1️⃣ Install dependencies

```bash
npm install
```

### 2️⃣ Build the project

```bash
npm run build
```

### 3️⃣ Run locally (optional)

```bash
node build/index.js
```

---

## 🔑 Environment Variables

Create a `.env` file in the root:

```env
ALLOWED_FOLDER=your-folder-path
```

👉 Example:

```
ALLOWED_FOLDER=D:/Users/YourName/Desktop/TestFolder
```

---

## 🧠 How It Works

* Claude Desktop starts your MCP server using the config file
* Your server exposes tools (like `list_files`)
* When Claude calls a tool → your server executes logic → returns result

---

## 🔌 Claude Desktop Integration

Add this to your Claude config file:

```json
{
  "mcpServers": {
    "file-reader": {
      "command": "node",
      "args": ["D:/path-to-your-project/build/index.js"],
      "env": {
        "ALLOWED_FOLDER": "D:/your-folder-path"
      }
    }
  }
}
```

---

## 🧪 Usage

In Claude, simply ask:

```
List files from allowed folder
```

---

## ⚠️ Important Notes

* Do NOT expose sensitive folders
* Always validate paths if adding dynamic input
* `.env` is ignored from Git for security

---

## 🚀 Future Improvements

* 📖 Read file content
* ✍️ Create / write files
* 🗑️ Delete files
* 🔍 Search files

---

## 🙌 Author

**Harshit Verma**

---

## ⭐ If you like this project

Give it a star ⭐ and feel free to contribute!
