import { createFileRoute } from "@tanstack/react-router";
import { OriginTv } from "@/components/os/OriginTv";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OriginTV — Liquid Glass TV OS" },
      {
        name: "description",
        content:
          "A cinematic liquid-glass TV operating system: lock screen widgets, live wallpapers, AOD, screensaver, cloud gallery, music, AI assistant and phone transfers.",
      },
      { property: "og:title", content: "OriginTV — Liquid Glass TV OS" },
      {
        property: "og:description",
        content:
          "A cinematic liquid-glass TV operating system: lock screen widgets, live wallpapers, AOD, screensaver, cloud gallery, music, AI assistant and phone transfers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <OriginTv />;
}
