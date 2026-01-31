import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export function DesignWithAIModal() {
  const [open, setOpen] = useState(false)
  const [goal, setGoal] = useState('')
  const [url, setUrl] = useState('/landing/ai-demo')
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function draft() {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('id_token') || ''
      const resp = await fetch('/api/ai/builder/page', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ url, title: goal || 'AI Draft', blocks: [], publish: false })
      })

      if (!resp.ok) {
        throw new Error(`Draft failed: HTTP ${resp.status}`)
      }

      const data = (await resp.json()) as { previewUrl?: string }
      setPreview(data.previewUrl ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Draft failed')
    } finally {
      setLoading(false)
    }
  }

  async function apply() {
    if (!preview) return
    setLoading(true)
    setError(null)
    try {
      const id = new URL(preview).searchParams.get('builder.preview')
      if (!id) {
        throw new Error('Missing preview id')
      }
      const token = localStorage.getItem('id_token') || ''
      const resp = await fetch('/api/ai/builder/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ id, model: 'page', action: 'publish' })
      })

      if (!resp.ok) {
        throw new Error(`Publish failed: HTTP ${resp.status}`)
      }

      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Design with AI
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Design with AI</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Goal</label>
              <Textarea
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder="Describe what you want to build"
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Target URL</label>
              <Input value={url} onChange={e => setUrl(e.target.value)} />
            </div>

            {error && <div className="text-sm text-destructive">{error}</div>}

            <div className="flex gap-2">
              <Button onClick={draft} disabled={loading}>
                Generate Draft
              </Button>
              <Button onClick={apply} disabled={!preview || loading}>
                Apply
              </Button>
              <Button variant="secondary" onClick={() => setOpen(false)} disabled={loading}>
                Close
              </Button>
            </div>

            {preview && (
              <div className="rounded-md border">
                <iframe
                  src={preview}
                  title="Builder Preview"
                  className="h-[600px] w-full rounded-md"
                />
              </div>
            )}
          </div>

          <DialogFooter />
        </DialogContent>
      </Dialog>
    </>
  )
}
