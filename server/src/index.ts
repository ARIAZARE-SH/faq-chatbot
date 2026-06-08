import express, { Request, Response } from "express";
import cors from "cors";
import faqs from "./faqs.json";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface FAQ {
  id: number;
  question: string;
  answer: string;
}

interface ChatRequest {
  message: string;
}

// GET all FAQs
app.get("/api/faqs", (_req: Request, res: Response) => {
  res.json(faqs);
});

// POST /api/chat — sends user message + FAQ context to Ollama
app.post("/api/chat", async (req: Request, res: Response) => {
  const { message } = req.body as ChatRequest;

  if (!message?.trim()) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  // Build FAQ context string
  const faqContext = (faqs as FAQ[])
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join("\n\n");

  const systemPrompt = `You are a friendly and knowledgeable shopping assistant for an online clothing store. Your name is Stylie.
Your job is to help customers with questions about sizing, orders, shipping, returns, payments, and our products.

Guidelines:
- Answer using ONLY the FAQ information provided below. Do not make up policies or information.
- Be warm, helpful, and enthusiastic — like a great in-store stylist.
- Keep answers clear and concise. Use bullet points when listing multiple steps or options.
- If a question is not covered by the FAQs, say: "I don't have that info on hand, but our support team would love to help! Reach us at support@ourstore.com or via live chat."
- Never discuss competitors or make comparisons with other stores.
- If a customer seems frustrated (e.g. about a delay or wrong item), acknowledge their feeling before giving the answer.

--- FAQ DATA ---
${faqContext}
--- END FAQ DATA ---`;

  try {
    // Stream response from Ollama
    const ollamaRes = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen2.5:1.5b",
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
      }),
    });

    if (!ollamaRes.ok || !ollamaRes.body) {
      res.status(500).json({ error: "Ollama request failed" });
      return;
    }

    // Forward the stream to the client
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = ollamaRes.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter(Boolean);

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          const token = parsed?.message?.content ?? "";
          if (token) {
            res.write(`data: ${JSON.stringify({ token })}\n\n`);
          }
          if (parsed?.done) {
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          }
        } catch {
          // skip malformed lines
        }
      }
    }

    res.end();
  } catch (err) {
    console.error("Ollama error:", err);
    res.status(500).json({ error: "Could not reach Ollama. Is it running?" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`📄 FAQs loaded: ${faqs.length} entries`);
});