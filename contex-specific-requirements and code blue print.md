Copy and Paste this Prompt:
Task: Refactor my chat interface to follow modern mobile UI/UX best practices.

Goal: Create a unified "Composer" experience that is thumb-friendly and maximizes vertical space for messages.

Requirements:

Unified Input Panel: Wrap the textarea and action buttons inside a single card with a subtle border/background.

Pill-Style Selectors: Replace standard dropdowns with "Pills" (rounded buttons) for Mode and Folder. Place these inside the input panel area.

Mobile Optimization: > - Ensure the text input font size is exactly 16px to prevent iOS auto-zoom.

Use 100dvh for the container height to handle mobile browser bars correctly.

Position the "Send" button as an icon inside the bottom-right of the input card.

Aesthetics: Use a "Dark Mode" palette (Background: #0a0b0d, Card: #161b22, Borders: #30363d).

Reference Code Structure: Please use a Flexbox layout where the .chat-viewport has flex: 1 and the .input-container is pinned to the bottom.

Protips:
The "Pill" Detail: Dont use old fashion design dropdown. "Instead of a <select> tag, use a <div> with a border-radius of 20px to act as a button. We will make it open a menu later.

To make this feel like a native mobile app, we'll use a Bottom Sheet approach. When a user taps a "Pill" (like Mode or Folder), a menu slides up from the bottom. This is much easier for thumbs to reach than a menu appearing in the middle of the screen.

I have updated the code to include the overlay logic and the JavaScript to toggle these menus.

Create a new file named ChatPanel.html
HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>AutoCoder Mobile</title>
    <style>
        :root {
            --bg-dark: #0a0b0d;
            --card-bg: #161b22;
            --border: #30363d;
            --accent: #238636;
            --text-main: #e6edf3;
            --text-muted: #8b949e;
            --overlay: rgba(0, 0, 0, 0.7);
        }

        body {
            margin: 0;
            background-color: var(--bg-dark);
            color: var(--text-main);
            font-family: -apple-system, system-ui, sans-serif;
            height: 100dvh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        /* Main Chat Area */
        .chat-viewport {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
        }

        /* Bottom Input Group */
        .input-container {
            padding: 12px;
            background: var(--bg-dark);
            border-top: 1px solid var(--border);
            z-index: 10;
        }

        .composer-card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        textarea {
            background: transparent;
            border: none;
            color: white;
            font-size: 16px;
            resize: none;
            outline: none;
            min-height: 40px;
        }

        .action-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .config-pills {
            display: flex;
            gap: 8px;
        }

        .pill {
            background: #21262d;
            border: 1px solid var(--border);
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 6px;
            color: var(--text-muted);
            cursor: pointer;
        }

        .pill span { color: var(--text-main); font-weight: 500; }

        .send-trigger {
            background: var(--accent);
            color: white;
            border: none;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* Bottom Sheet Menu */
        .menu-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: var(--overlay);
            display: none;
            z-index: 100;
        }

        .bottom-sheet {
            position: fixed;
            bottom: -100%;
            left: 0; right: 0;
            background: var(--card-bg);
            border-top: 1px solid var(--border);
            border-radius: 16px 16px 0 0;
            padding: 20px;
            transition: bottom 0.3s ease;
            z-index: 101;
        }

        .bottom-sheet.active { bottom: 0; }
        .menu-overlay.active { display: block; }

        .menu-option {
            padding: 16px;
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            font-size: 16px;
        }

        .menu-option:last-child { border-none; }
    </style>
</head>
<body>

<div class="chat-viewport" id="chat-viewport">
    </div>

<div class="input-container">
    <div class="composer-card">
        <textarea id="chat-input" placeholder="Type message..."></textarea>
        <div class="action-bar">
            <div class="config-pills">
                <div class="pill" onclick="openMenu('mode')">Mode: <span id="mode-val">Assistant</span></div>
                <div class="pill" onclick="openMenu('folder')">Folder: <span id="folder-val">Root</span></div>
            </div>
            <button class="send-trigger">➤</button>
        </div>
    </div>
</div>

<div class="menu-overlay" id="overlay" onclick="closeMenu()"></div>
<div class="bottom-sheet" id="bottom-sheet">
    <h3 style="margin-top: 0; font-size: 14px; color: var(--text-muted);" id="menu-title">Select Option</h3>
    <div id="menu-options">
        </div>
</div>

<script>
    const data = {
        mode: ['Assistant', 'Coder', 'Creative', 'Research'],
        folder: ['Root', 'Projects', 'Archive', 'Drafts']
    };

    function openMenu(type) {
        const sheet = document.getElementById('bottom-sheet');
        const overlay = document.getElementById('overlay');
        const optionsContainer = document.getElementById('menu-options');
        const title = document.getElementById('menu-title');

        title.innerText = `Select ${type.toUpperCase()}`;
        optionsContainer.innerHTML = '';

        data[type].forEach(opt => {
            const div = document.createElement('div');
            div.className = 'menu-option';
            div.innerText = opt;
            div.onclick = () => {
                document.getElementById(`${type}-val`).innerText = opt;
                closeMenu();
            };
            optionsContainer.appendChild(div);
        });

        sheet.classList.add('active');
        overlay.classList.add('active');
    }

    function closeMenu() {
        document.getElementById('bottom-sheet').classList.remove('active');
        document.getElementById('overlay').classList.remove('active');
    }
</script>

</body>
</html>
What this adds:
Overlay & Bottom Sheet: Uses CSS transitions to slide the menu up from the bottom, which is the gold standard for mobile "Select" inputs.

JavaScript Logic: * openMenu(type): Clears and repopulates the menu based on which pill was clicked.

closeMenu(): Hides the sheet when you tap the dark background.

Value Update: Tapping an option updates the text inside the pill immediately.