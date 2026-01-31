From your repo root (clean working tree):

# create branch, install deps, apply patch, push
curl -L -o ui-workspace.patch "sandbox:/home/ui-workspace.patch"
curl -L -o apply-ui-workspace.sh "sandbox:/home/apply-ui-workspace.sh"
chmod +x apply-ui-workspace.sh
./apply-ui-workspace.sh ui-workspace ./ui-workspace.patch .


What this does:

Creates branch ui-workspace

Installs UI libs: react-resizable-panels (resizable columns), @monaco-editor/react (code editor), react-diff-viewer-continued (diff), framer-motion (animations), zustand (state)

Adds Primer-like dark tokens and triple-pane workspace:

app/workspace/page.tsx (new route to preview)

components/workspace/* (Layout, Stepper, SpecPane, PlannerPane, CodePane)

lib/workspace/state.ts (global store)

styles/primer.css (GitHub-style theme)

Commits and pushes the branch

2) Preview

Start your dev server and open /workspace:

npm run dev
# open http://localhost:3000/workspace


You’ll see:

Header Stepper: Brainstorm → Plan → Implement → Verify

Column 1 – Specification: Issue-style textarea + Context badges + “Generate Plan”

Column 2 – Planner: Editable checklist with file badges

Column 3 – Code Workspace: File list + Diff viewer (toggleable editor) + Accept/Discard actions

3) Make it your Landing Page (after approval)

Your AI can create a follow-up PR that:

Sets / → redirect to /workspace (or copies the layout to app/page.tsx)

Adds production color polish and spacing if needed.

Example redirect (Next.js app/page.tsx):

import { redirect } from "next/navigation";
export default function Home(){ redirect("/workspace"); return null; }

4) Production rollout checklist (for your AI)

Visual QA against your screenshots (spacing, borders, colors).

Telemetry: log workspace interactions (optional).

Access control (if landing is gated): only show edit tools to staff/admin.

E2E smoke (optional): ensure /workspace loads and panes render.

5) What was added in the patch
styles/primer.css                         # GitHub-like dark tokens
app/workspace/page.tsx                    # Triple-pane page
components/workspace/WorkspaceLayout.tsx  # Resizable panels wrapper
components/workspace/WorkflowStepper.tsx  # Header stepper
components/workspace/SpecPane.tsx         # Column 1
components/workspace/PlannerPane.tsx      # Column 2
components/workspace/CodePane.tsx         # Column 3 (Monaco + Diff)
lib/workspace/state.ts                    # Zustand state/model
components/workspace/styles.css           # Imports primer.css

6) Optional: turn it into “AI tasks” for your agent

If your agent accepts structured tasks, feed it this ordered list:

Create branch: ui-workspace.

Install deps:
npm i react-resizable-panels @monaco-editor/react react-diff-viewer-continued framer-motion zustand

Add theme tokens: write styles/primer.css with the Primer palette from #3.

Create components: write files listed in section 5 exactly as in the patch.

Add route: write app/workspace/page.tsx.

Run dev & screenshot /workspace for review.

Open PR with title: UI Workspace: Copilot-style triple-pane landing.

After approval, redirect / → /workspace and open a second PR titled Set new workspace as landing.
