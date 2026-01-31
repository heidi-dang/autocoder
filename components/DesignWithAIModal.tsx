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
