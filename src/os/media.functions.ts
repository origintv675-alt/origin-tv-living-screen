import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Signed URLs for the signed-in device's own files (private buckets). */
export const createSignedUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bucket: string; paths: string[] }) => input)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const urls: Record<string, string> = {};
    for (const path of data.paths.slice(0, 60)) {
      const { data: signed } = await supabaseAdmin.storage
        .from(data.bucket)
        .createSignedUrl(path, 60 * 60);
      if (signed) urls[path] = signed.signedUrl;
    }
    return urls;
  });

/** Copy a received transfer into the device's cloud gallery. */
export const saveToGallery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { storage_path: string; title: string; mime_type: string; size_bytes: number }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: blob, error: dlErr } = await supabaseAdmin.storage
      .from("transfers")
      .download(data.storage_path);
    if (dlErr || !blob) throw new Error("File not found in your transfers");
    const filename = data.storage_path.split("/").pop() ?? "file";
    const newPath = `${context.userId}/${Date.now()}-${filename}`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("media")
      .upload(newPath, blob, { contentType: data.mime_type || "application/octet-stream" });
    if (upErr) throw new Error("Could not copy the file into your gallery");
    const kind = data.mime_type.startsWith("video")
      ? "video"
      : data.mime_type.startsWith("audio")
        ? "audio"
        : "image";
    const { error } = await supabaseAdmin.from("media").insert({
      user_id: context.userId,
      kind,
      mime_type: data.mime_type || "application/octet-stream",
      size_bytes: data.size_bytes || blob.size,
      storage_path: newPath,
      title: data.title || filename,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
