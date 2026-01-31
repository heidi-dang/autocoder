import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireRole";
import { z } from "zod";

const Body = z.object({ id: z.string(), model: z.enum(["page","section"]), action: z.enum(["publish","unpublish"]) });

export async function POST(req: NextRequest) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  await requireRole(token);
  const body = Body.parse(await req.json());

  const res = await fetch("https://builder.io/api/v3/write/content", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.BUILDER_WRITE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: body.model,
      entry: { id: body.id },
      publish: body.action === "publish"
    })
  });
  const json = await res.json();
  return NextResponse.json(json);
}
