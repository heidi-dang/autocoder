# Builder.io Integration Guide for AutoCoder UI

## 📋 Overview

This setup enables **visual editing** of your React components using Builder.io's visual editor. Changes made in Builder.io Studio automatically sync to your live preview.

## 🚀 Quick Start

### Step 1: Get Builder.io API Key

1. Go to [builder.io](https://builder.io)
2. Sign up or log in to your account
3. Navigate to **Account Settings** → **API Keys**
4. Copy your **Public API Key**

### Step 2: Configure Environment

```bash
cd /home/heidi/Desktop/autocoder/ui

# Copy the example env file
cp .env.local.example .env.local

# Edit .env.local and paste your API key
# VITE_BUILDER_API_KEY=your_api_key_here
```

### Step 3: Start Development Server

#### On macOS/Linux:
```bash
chmod +x dev-server-builder.sh
./dev-server-builder.sh
```

#### On Windows:
```cmd
dev-server-builder.bat
```

#### Or manually:
```bash
npm run dev
```

The dev server will start on **http://localhost:5173**

### Step 4: Access Builder.io Editor

Open your browser:
```
http://localhost:5173?builder.edit=true&builder.token=YOUR_API_KEY
```

## 🎯 Features Included

### Configuration Files

| File | Purpose |
|------|---------|
| `src/lib/builder-config.ts` | Builder.io SDK configuration & component registration |
| `src/lib/builder-provider.tsx` | React provider for Builder.io initialization |
| `vite.config.builder.ts` | Vite configuration optimized for Builder.io |
| `BUILDER_IO_SETUP.md` | Detailed setup instructions |
| `dev-server-builder.sh` | Linux/macOS launcher script |
| `dev-server-builder.bat` | Windows launcher script |
| `.env.local.example` | Environment variables template |

### Development Features

✅ **Hot Module Reloading (HMR)** - See changes instantly  
✅ **Builder.io Visual Editing** - Edit components without code  
✅ **Source Maps** - Full TypeScript debugging  
✅ **CORS Headers** - Enable cross-origin requests  
✅ **Environment Variables** - Secure API key management  
✅ **Component Registration** - Auto-register custom components  

## 📱 Component Registration

To make a component editable in Builder.io, register it in `src/lib/builder-config.ts`:

```tsx
import { Builder } from "@builder.io/react";
import { QuickChat } from "@/components/QuickChat";

Builder.registerComponent(QuickChat, {
  name: "QuickChat",
  displayName: "AI Quick Chat",
  description: "AI-powered quick chat interface",
  inputs: [
    {
      name: "onClose",
      type: "function",
      description: "Callback when chat closes",
    },
  ],
});
```

## 🔌 Integration Points

### In Main App (src/main.tsx)

The app automatically initializes Builder.io when the API key is set:

```tsx
import { BuilderProvider } from '@/lib/builder-provider';

createRoot(document.getElementById("root")!).render(
  <BuilderProvider apiKey={import.meta.env.VITE_BUILDER_API_KEY}>
    <App />
  </BuilderProvider>
);
```

### Using Builder Content

Load and render content from Builder.io:

```tsx
import { getBuilderContent } from '@/lib/builder-config';

const content = await getBuilderContent(
  'page',
  window.location.pathname,
  apiKey
);
```

## 🛠️ Development Workflow

### Option 1: Standard Dev Server
```bash
npm run dev
# Starts on http://localhost:5173
```

### Option 2: With Builder.io Script
```bash
# macOS/Linux
./dev-server-builder.sh

# Windows
dev-server-builder.bat
```

This automatically:
- Checks for Node.js installation
- Creates `.env.local` if missing
- Installs dependencies
- Starts Vite with optimized settings
- Shows helpful tips

## 🔐 Security Best Practices

1. **Never commit `.env.local`** - Add to `.gitignore`
2. **Use environment variables** - Store sensitive keys in `.env.local`
3. **Validate API key** - Check it's set before loading Builder.io
4. **CORS Configuration** - Headers already configured in `vite.config.ts`

### Example .gitignore
```
.env.local
.env.*.local
```

## 📊 Debugging

### Enable Debug Mode
```javascript
// In browser DevTools console
localStorage.setItem('builder.debug', 'true');
location.reload();
```

### Check API Connection
```bash
curl -s -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.builder.io/v1/me
```

### View Builder.io Logs
```javascript
// In browser console
window.localStorage.setItem('builder.debug.logs', 'true');
```

## 🚨 Troubleshooting

### "API Key not recognized"
- ✅ Verify key in `.env.local`
- ✅ Restart dev server after changing `.env`
- ✅ Check key in Builder.io dashboard

### "Port 5173 already in use"
```bash
# Kill process using port 5173
lsof -ti:5173 | xargs kill -9

# Or use different port
npm run dev -- --port 5174
```

### "Builder.io SDK not loading"
- ✅ Check network tab for CDN errors
- ✅ Verify CORS headers in Vite config
- ✅ Clear browser cache: `Ctrl+Shift+Delete`

### "Hot reload not working"
- ✅ Verify Vite HMR config: `vite.config.ts`
- ✅ Check firewall/proxy settings
- ✅ Restart dev server

## 📚 Resources

- [Builder.io React Docs](https://www.builder.io/docs/react)
- [Builder.io API Reference](https://www.builder.io/docs/api)
- [Vite Documentation](https://vitejs.dev)
- [React Documentation](https://react.dev)

## 🎓 Next Steps

1. **Create Models in Builder.io**
   - Go to Builder.io dashboard
   - Create new model for your components
   - Configure inputs/outputs

2. **Register Custom Components**
   - Edit `src/lib/builder-config.ts`
   - Add your component registration
   - Restart dev server

3. **Start Visual Editing**
   - Open `http://localhost:5173?builder.edit=true`
   - Select your model
   - Start editing components visually!

4. **Deploy with Builder.io**
   - Build your app: `npm run build`
   - Deploy to production
   - Update Builder.io preview URL

## 💡 Pro Tips

- Use **Builder.io's Symbols** for reusable components
- **Bind data** to your backend APIs
- **Preview on mobile** using DevTools device emulation
- **Collaborate** by sharing Builder.io content URLs
- **Version control** - export Builder.io content as JSON

## 🤝 Support

For issues or questions:
- [Builder.io Support](https://www.builder.io/support)
- [Builder.io Community](https://www.builder.io/community)
- [GitHub Issues](https://github.com/BuilderIO/builder)
