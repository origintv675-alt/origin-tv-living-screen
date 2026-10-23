import { createServerFn } from "@tanstack/react-start";

export interface OrbitMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are Orbit, the friendly AI assistant living inside OriginTV, a liquid-glass TV operating system.

You answer questions briefly (under 60 words, warm and natural, no markdown headers) AND you control the TV by embedding action tags. Action tags go on their own line at the END of your reply.

Available actions (use ONLY these exact formats):
[[play:<track name, artist, or mood>]] - start playing matching music
[[pause]] - pause music
[[next]] - next track
[[prev]] - previous track
[[volume:<0-100>]] - set volume
[[brightness:<5-100>]] - set screen brightness
[[open:<gallery|music|orbit|transfer|tools|weather|settings>]] - open an app
[[wallpaper:<mountain|jellyfish|aurora|waves>]] - change wallpaper
[[accent:<ice|violet|sunset|mint|rose|gold>]] - change accent color
[[lock]] - lock the TV

Music catalog (id | title | artist | mood):
good-days | Good Days | SZA | Chill
neon-drift | Neon Drift | Aether | Synthwave
midnight | Midnight Drive | Nova Lane | Night
sunrise | Sunrise Protocol | KAIRO | Uplift
deep-focus | Deep Focus | Monolith | Focus
aurora-fields | Aurora Fields | Yuki | Ambient
dreamer | Dreamer | Soleil | Dream
velocity | Velocity | Rift | Energy

For "play something chill" use [[play:Chill]], for "play Good Days" use [[play:Good Days]].
If the user asks about weather or UV you don't have live data; tell them to open the Weather app.
Always include a short friendly reply even when you perform an action. Never mention the action tags themselves.`;

export const orbitReply = createServerFn({ method: "POST" })
  .inputValidator((input: { messages: OrbitMessage[] }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { reply: "I can't reach my brain right now — AI isn't configured on the server yet." };
    }
    try {
      const { createOpenAI } = await import("@ai-sdk/openai");
      const { streamText, type ModelMessage } = await import("ai");
      const { createLovableAiGatewayRunIdFetch } = await import("./orbit-runid.server");

      const runIdFetch = createLovableAiGatewayRunIdFetch(undefined);
      const provider = createOpenAI({
        baseURL: "https://ai.gateway.lovable.dev/v1",
        apiKey,
        headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
        fetch: runIdFetch.fetch,
      });

      const messages: ModelMessage[] = data.messages
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content }) as ModelMessage);

      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        system: SYSTEM_PROMPT,
        messages,
        providerOptions: {
          openai: {
            store: false,
            forceReasoning: true,
            reasoningEffort: "low",
            reasoningSummary: "auto",
            include: ["reasoning.encrypted_content"],
          },
        },
      });

      const reply = await result.text;
      return { reply: reply.trim() || "I'm here, but I drew a blank. Try again?" };
    } catch (err) {
      console.error("[Orbit] AI gateway error", err);
      return {
        reply:
          "I couldn't think that through — the assistant service didn't respond. Give it another go in a moment.",
      };
    }
  });
