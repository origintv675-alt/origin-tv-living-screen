import { createFileRoute } from "@tanstack/react-router";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BYTES = 25 * 1024 * 1024;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: cors });

export const Route = createFileRoute("/api/public/transfer")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),

      POST: async ({ request }) => {
        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return json({ error: "Send the file as multipart form data" }, 400);
        }

        const tv = String(form.get("tv") ?? "");
        if (!UUID_RE.test(tv)) {
          return json({ error: "Invalid TV code — scan the QR on your TV again" }, 400);
        }

        const file = form.get("file");
        if (!(file instanceof File) || file.size === 0) {
          return json({ error: "No file attached" }, 400);
        }
        if (file.size > MAX_BYTES) {
          return json({ error: "File too large — keep it under 25 MB" }, 413);
        }
        const mime = file.type || "application/octet-stream";
        if (!/^(image|video|audio)\//.test(mime)) {
          return json({ error: "Only photos, videos and audio can be sent" }, 415);
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const safeName = (file.name || "file").replace(/[^\w.\- ]+/g, "_").slice(0, 80);
        const path = `${tv}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabaseAdmin.storage
          .from("transfers")
          .upload(path, file, { contentType: mime });
        if (upErr) {
          console.error("[transfer] upload failed", upErr);
          return json({ error: "Could not receive the file right now" }, 500);
        }

        const code = Math.random().toString(36).slice(2, 8).toUpperCase();
        const { error: insErr } = await supabaseAdmin.from("transfers").insert({
          user_id: tv,
          code,
          filename: safeName,
          mime_type: mime,
          size_bytes: file.size,
          storage_path: path,
          expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        });
        if (insErr) {
          console.error("[transfer] insert failed", insErr);
          return json({ error: "Received the file but could not register it" }, 500);
        }

        return json({ ok: true, code });
      },
    },
  },
});
