import { createServerFn } from "@tanstack/react-start";

export const generateOpenAIAudio = createServerFn({ method: "POST" })
  .inputValidator((data: { text: string; voice?: string }) => ({
    text: String(data?.text ?? "").slice(0, 4000),
    voice: String(data?.voice ?? "alloy"),
  }))
  .handler(async ({ data }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
    if (!data.text.trim()) throw new Error("Text is empty");

    const allowed = ["alloy", "echo", "fable", "onyx", "nova", "shimmer", "ash", "ballad", "coral", "sage", "verse"];
    const voice = allowed.includes(data.voice) ? data.voice : "alloy";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-audio",
        modalities: ["text", "audio"],
        audio: { voice, format: "wav" },
        messages: [
          {
            role: "system",
            content:
              "You are a calm, natural-sounding human narrator. Read the user's text aloud exactly as written, in a smooth, warm, slightly slow, cinematic tone. Do not add commentary.",
          },
          { role: "user", content: data.text },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`OpenAI audio failed [${res.status}]: ${errText.slice(0, 300)}`);
    }

    const json = await res.json();
    const b64 = json?.choices?.[0]?.message?.audio?.data;
    if (!b64) throw new Error("No audio data returned from OpenAI");
    return { audioBase64: b64, mime: "audio/wav" };
  });