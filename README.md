# 👗 Stylie — AI FAQ Chatbot for Online Clothing Store

Full-stack AI FAQ chatbot for an online clothing store. Built with Express.js, React & TypeScript, powered by local Ollama (qwen2.5:1.5b). FAQs stored in JSON — no DB needed. Features streaming responses, localStorage chat history with timestamps, and a dark UI with user/bot avatars.

---

## ✨ Features

- 🤖 AI answers powered by **Ollama** running locally — no API keys, no cost
- 📄 FAQs stored in a plain **JSON file** — just edit and save, no database
- ⚡ **Streaming responses** — tokens appear in real time as the AI replies
- 💾 **Persistent chat history** via `localStorage` — survives page refreshes
- 🕐 **Timestamps** on every message — smart display (Today / Yesterday / Date)
- 👤 **User & bot avatars** with labels for each message
- 🎨 Clean **dark UI** with accent-colored scrollbars and sidebar quick-questions
- 📱 Responsive — sidebar hides on mobile

---

## 🛠 Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Backend | Express.js, TypeScript, ts-node-dev |
| AI Model | Ollama — `qwen2.5:1.5b` |
| Storage | JSON file (FAQs) + localStorage (chat history) |
| Styling | Plain CSS with CSS variables |

---

## 📁 Project Structure

```
faq-chatbot/
├── server/
│   ├── src/
│   │   ├── index.ts        # Express server + Ollama streaming
│   │   └── faqs.json       # Your FAQ data
│   ├── package.json
│   └── tsconfig.json
└── client/
    ├── src/
    │   ├── App.tsx         # Chat UI + localStorage logic
    │   ├── main.tsx        # React entry point
    │   └── index.css       # Dark theme styles
    ├── index.html
    ├── vite.config.ts      # Proxies /api → localhost:3001
    ├── package.json
    └── tsconfig.json
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Ollama](https://ollama.com/) installed and running

### 1. Pull the AI model

```bash
ollama pull qwen2.5:1.5b
```

Make sure Ollama is running (it usually starts automatically):

```bash
ollama serve
```

### 2. Start the backend

```bash
cd server
npm install
npm run dev
```

Server runs at **http://localhost:3001**

### 3. Start the frontend

```bash
cd client
npm install
npm run dev
```

App runs at **http://localhost:5173**

---

## 📝 Customizing FAQs

Edit `server/src/faqs.json` — add, remove, or update entries:

```json
[
  {
    "id": 9,
    "question": "Do you offer gift wrapping?",
    "answer": "Yes! Add gift wrapping at checkout for $3.99. We'll include a handwritten note if you leave a message."
  }
]
```

No restart needed for FAQ changes — they're read fresh on each chat request.

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/faqs` | Returns all FAQs (used by sidebar) |
| `POST` | `/api/chat` | Sends message to Ollama, streams response via SSE |

### POST `/api/chat` request body

```json
{ "message": "What is your return policy?" }
```

### Response — Server-Sent Events stream

```
data: {"token": "We"}
data: {"token": " accept"}
data: {"token": " returns"}
...
data: {"done": true}
```

---

## ⚙️ Configuration

| Setting | Location | Default |
|---|---|---|
| Server port | `server/src/index.ts` | `3001` |
| Ollama model | `server/src/index.ts` | `qwen2.5:1.5b` |
| Ollama URL | `server/src/index.ts` | `http://localhost:11434` |
| Client port | `client/vite.config.ts` | `5173` |
| Chat storage key | `client/src/App.tsx` | `stylie_chat_history` |

---

## 🧹 Clear Chat History

Click the **🗑 Clear history** button in the top-right of the chat area. This removes the saved history from `localStorage` and resets the conversation.

---

## 📦 Building for Production

**Backend:**
```bash
cd server
npm run build    # compiles to /dist
npm start        # runs compiled JS
```

**Frontend:**
```bash
cd client
npm run build    # outputs to /dist
npm run preview  # preview the build locally
```

---

## 📄 License

MIT
