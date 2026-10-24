import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Send, Tv } from "lucide-react";

export const Route = createFileRoute("/transfer")({
  head: () => ({
    meta: [
      { title: "Send to OriginTV" },
      {
        name: "description",
        content: "Send photos, videos and audio from your phone to your OriginTV cloud gallery.",
      },
      { property: "og:title", content: "Send to OriginTV" },
      {
        property: "og:description",
        content: "Send photos, videos and audio from your phone to your OriginTV cloud gallery.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TransferPage,
});

function TransferPage() {
  const [tv, setTv] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tv");
    setTv(t && /^[0-9a-f-]{36}$/i.test(t) ? t : null);
  }, []);

  const send = async (file: File) => {
    if (!tv) return;
    setBusy(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("tv", tv);
      fd.append("file", file);
      const res = await fetch("/api/public/transfer", { method: "POST", body: fd });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setResult(
        res.ok
          ? { ok: true, text: `${file.name} is on its way to your TV.` }
          : { ok: false, text: body.error ?? "Something went wrong. Try again." },
      );
    } catch {
      setResult({ ok: false, text: "Network problem — check your connection and try again." });
    } finally {
      setBusy(false);
    }
  };

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const f of Array.from(files).slice(0, 5)) await send(f);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-5 py-10"
      style={{ background: "oklch(0.145 0.03 265)", color: "oklch(0.955 0.008 250)" }}
    >
      <div
        className="w-full max-w-md rounded-3xl p-8 text-center"
        style={{
          background: "oklch(0.32 0.07 260 / 0.35)",
          border: "1px solid oklch(1 0 0 / 0.22)",
          backdropFilter: "blur(26px) saturate(165%)",
          boxShadow: "0 18px 50px -18px rgb(0 0 0 / 0.55)",
        }}
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "oklch(0.74 0.14 245 / 0.2)" }}>
          <Tv className="h-7 w-7" style={{ color: "oklch(0.74 0.14 245)" }} />
        </div>
        <h1 className="text-2xl font-bold">Send to OriginTV</h1>

        {!tv ? (
          <p className="mt-4 text-sm opacity-70">
            Open the Transfer app on your OriginTV and scan the QR code with this phone.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm opacity-70">
              Pick photos, videos or audio. They land in your TV's cloud library.
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*"
              className="hidden"
              onChange={(e) => pick(e.target.files)}
            />
            <button
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-base font-semibold disabled:opacity-50"
              style={{ background: "oklch(0.74 0.14 245)", color: "oklch(0.16 0.03 265)" }}
            >
              <Send className="h-5 w-5" />
              {busy ? "Sending…" : "Choose files"}
            </button>
            {result && (
              <p className="mt-4 text-sm" style={{ color: result.ok ? "oklch(0.78 0.15 165)" : "oklch(0.62 0.2 20)" }}>
                {result.text}
              </p>
            )}
          </>
        )}

        <p className="mt-8 text-[10px] tracking-[0.3em] opacity-40">ORIGINTV TRANSFER</p>
      </div>
    </div>
  );
}
