import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireRole";
import { z } from "zod";

const Body = z.object({
  url: z.string().startsWith("/"),
  title: z.string().min(1),
  tags: z.array(z.string()).optional(),
  blocks: z.any(),
  publish: z.boolean().default(false)
});

export async function POST(req: NextRequest) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  await requireRole(token);
  const body = Body.parse(await req.json());

  const res = await fetch("https://builder.io/api/v3/write/content", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.BUILDER_WRITE_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "page",
      publish: body.publish,
      query: { data: { url: body.url } },
      data: { title: body.title, url: body.url, tags: body.tags ?? [] },
      blocks: body.blocks
    })
  });

  const json = await res.json();
  const previewUrl = `${process.env.APP_BASE_URL}${body.url}?builder.preview=${json.id}`;
  return NextResponse.json({ id: json.id, version: json.version, previewUrl });
}
