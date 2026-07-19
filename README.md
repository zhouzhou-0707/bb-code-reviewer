# 🔍 AI Code Review

> Select code → Right-click → AI reviews it instantly.

Supports **Claude**, **OpenAI**, **DeepSeek**, **通义千问**, **Moonshot (Kimi)**, and custom OpenAI-compatible APIs. Bring your own API key.

---

## ✨ Features

- ⚡ **One-click review** — select code, right-click, done
- 🔬 **6 focused checks** — only reports real problems, not noise
- 🌐 **Multi-provider** — Claude, GPT, DeepSeek, Qwen, Moonshot, or any custom API
- 🔒 **Secure** — API keys stored in OS-level credential store
- 💰 **Cheap** — DeepSeek costs ~¥0.01 per review
- 📦 **Zero dependencies** — uses only Node.js built-in modules

### What it checks

| Severity | Check |
|----------|-------|
| 🔴 High | Null/undefined access risks |
| 🔴 High | Unhandled async errors (missing try-catch / .catch) |
| 🟡 Medium | `await` inside loops (can be parallelized) |
| 🟡 Medium | Hardcoded secrets (keys, passwords, tokens) |
| 🔵 Low | Poor variable naming (x, tmp, data) |
| 🔵 Low | Missing boundary checks (array index, division by zero) |

---

## 🚀 Quick Start

### 1. Get an API Key

We recommend **DeepSeek** (cheapest, new users get free credits):
- [Register at platform.deepseek.com](https://platform.deepseek.com)
- Go to API Keys → Create → Copy the key

Also supported: [OpenAI](https://platform.openai.com), [通义千问](https://dashscope.console.aliyun.com), [Moonshot](https://platform.moonshot.cn)

### 2. Configure

- Open command palette: `Ctrl+Shift+P`
- Run: **"AI Review: Set API Key"**
- Select your provider and paste the key

### 3. Review!

- Open any code file
- Select some code
- Right-click → **🔍 AI Code Review**
- Results appear in the output panel

---

## ⚙️ Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `bbCodeReviewer.provider` | `deepseek` | AI provider |
| `bbCodeReviewer.model` | `""` | Model name (empty = use default) |
| `bbCodeReviewer.customBaseUrl` | `""` | Custom API URL (for self-hosted / Ollama) |

### Using Ollama (local model)

1. Set `bbCodeReviewer.provider` to `custom`
2. Set `bbCodeReviewer.customBaseUrl` to `http://localhost:11434`
3. Set `bbCodeReviewer.model` to your local model (e.g. `llama3`)
4. Set any value as API key (Ollama doesn't require one)

---

## 📋 Requirements

- VS Code 1.74.0 or newer
- An API key from one of the supported providers

---

## 🔒 Privacy

- Your code is sent directly from VS Code to the AI provider's API
- No third-party servers involved
- API keys stored in your OS credential store (Windows Credential Store / macOS Keychain / Linux libsecret)

---

## 🛠 Development

```bash
# Clone
cd bb-code-reviewer

# No npm install needed — zero dependencies!

# Test: press F5 in VS Code to launch Extension Development Host

# Build .vsix package
npm install -g @vscode/vsce   # one-time
vsce package
```
