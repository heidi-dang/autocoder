#!/usr/bin/env bash
set -euo pipefail

BRANCH="builder-integration"
REPO_DIR="."
cd "$REPO_DIR"

if [ ! -d ".git" ]; then echo "❌ Not a git repo"; exit 1; fi
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  Working tree not clean. Commit or stash first."; exit 1
fi

echo "🔀 creating branch: $BRANCH"
git fetch origin
git switch -c "$BRANCH" || git switch "$BRANCH"

echo "📁 scaffolding files..."
mkdir -p app/api/ai/builder/page app/api/ai/builder/publish app/[...slug] components lib/auth

# .env.example
cat > .env.example <<'ENV'
# Builder (dev)
BUILDER_PUBLIC_API_KEY=bb_xxx
BUILDER_WRITE_KEY=builder_write_xxx
APP_BASE_URL=http://localhost:3000

# JWT configuration
JWT_ISSUER=https://your-app.dev
JWT_JWKS_URI=https://your-app.dev/.well-known/jwks.json
ALLOWED_ROLES=admin,designer

# Optional OAuth client creds if you propagate provider claims into your JWTs
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
ENV

# app/[...slug]/page.tsx
cat > app/[...slug]/page.tsx <<'TSX'
import { Content } from "@builder.io/react";

export default async function BuilderCatchAll({ params }: { params: { slug?: string[] } }) {
  const urlPath = "/" + (params.slug?.join("/") ?? "");
  const apiKey = process.env.BUILDER_PUBLIC_API_KEY!;
  const content = await fetch(
    `https://cdn.builder.io/api/v3/content/page?apiKey=${apiKey}&userAttributes.urlPath=${encodeURIComponent(urlPath)}`,
    { next: { revalidate: 60 } }
  ).then(r => r.json());

  return <Content model="page" apiKey={apiKey} content={content?.results?.[0]} />;
}
TSX

# lib/auth/requireRole.ts
cat > lib/auth/requireRole.ts <<'TS'
import { createRemoteJWKSet, jwtVerify } from "jose";

const JWKS = createRemoteJWKSet(new URL(process.env.JWT_JWKS_URI!));

export async function requireRole(token: string, allowed = ["admin","designer"]) {
  const { payload } = await jwtVerify(token, JWKS, { issuer: process.env.JWT_ISSUER });
  const roles = (payload as any).roles ?? ((payload as any).role ? [(payload as any).role] : []);
  if (!Array.isArray(roles) || !roles.some((r: string) => allowed.includes(r))) {
    throw new Error("forbidden");
  }
  return payload;
}
TS

# app/api/ai/builder/page/route.ts
cat > app/api/ai/builder/page/route.ts <<'TS'
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
TS

# app/api/ai/builder/publish/route.ts
cat > app/api/ai/builder/publish/route.ts <<'TS'
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
TS

# components/DesignWithAIModal.tsx
cat > components/DesignWithAIModal.tsx <<'TSX'
"use client";
import { useState } from "react";

export function DesignWithAIModal() {
  const [open, setOpen] = useState(false);
  const [goal, setGoal] = useState("");
  const [url, setUrl] = useState("/landing/ai-demo");
  const [preview, setPreview] = useState<string | null>(null);

  async function draft() {
    const resp = await fetch("/api/ai/builder/page", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("id_token") || ""}` },
      body: JSON.stringify({ url, title: goal || "AI Draft", blocks: [], publish: false })
    }).then(r => r.json());
    setPreview(resp.previewUrl);
  }

  async function apply() {
    if (!preview) return;
    const id = new URL(preview).searchParams.get("builder.preview");
    await fetch("/api/ai/builder/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("id_token") || ""}` },
      body: JSON.stringify({ id, model: "page", action: "publish" })
    });
    setOpen(false);
  }

  return (
    <>
      <button onClick={() => setOpen(true)}>Design with AI</button>
      {open && (
        <div className="modal">
          <h3>Design with AI</h3>
          <label>Goal<input value={goal} onChange={e => setGoal(e.target.value)} /></label>
          <label>Target URL<input value={url} onChange={e => setUrl(e.target.value)} /></label>
          <div>
            <button onClick={draft}>Generate Draft</button>
            <button onClick={apply} disabled={!preview}>Apply</button>
            <button onClick={() => setOpen(false)}>Close</button>
          </div>
          {preview && <iframe src={preview} style={{ width: "100%", height: 600 }} />}
        </div>
      )}
    </>
  );
}
TSX

echo "📦 installing deps..."
npm i @builder.io/react jose zod >/dev/null 2>&1 || true

echo "📝 committing..."
git add -A
git commit -m "Builder.io integration: env example, catch-all, JWT guard, AI routes, modal"

echo "🚀 pushing branch $BRANCH ..."
git push -u origin "$BRANCH"

echo "✅ Done. Create a PR from '$BRANCH' to your default branch."
