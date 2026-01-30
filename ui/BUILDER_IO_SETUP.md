# Builder.io Development Server Configuration

This document explains how to set up and run the development server with Builder.io integration.

## Prerequisites

1. **Builder.io Account**: Sign up at [builder.io](https://builder.io)
2. **API Key**: Get your API key from Builder.io dashboard
3. **Environment Setup**: Configure the API key in your `.env.local` file

## Setup Steps

### 1. Create `.env.local` in `/ui` directory

```bash
cd /home/heidi/Desktop/autocoder/ui
cat > .env.local << 'EOF'
# Builder.io Configuration
VITE_BUILDER_API_KEY=YOUR_BUILDER_API_KEY_HERE

# Optional: Builder.io Settings
VITE_BUILDER_PREVIEW_URL=http://localhost:5173
VITE_BUILDER_EDIT_URL=http://localhost:5173?builder.edit=true
EOF
```

Replace `YOUR_BUILDER_API_KEY_HERE` with your actual API key.

### 2. Start Development Server

```bash
cd /home/heidi/Desktop/autocoder/ui
npm run dev
```

The dev server will start on `http://localhost:5173`

### 3. Access Builder.io Editor

Open your browser with the edit flag:
```
http://localhost:5173?builder.edit=true&builder.token=YOUR_BUILDER_API_KEY
```

Or visit the Builder.io dashboard and link your live preview URL.

## Development Server Features

- **Hot Module Reloading (HMR)**: Changes reflect instantly
- **Builder.io Integration**: Visual component editing
- **Source Maps**: Full TypeScript debugging support
- **Vite Optimizations**: Fast refresh and build

## NPM Scripts

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build locally
npm preview

# Run tests
npm test:smoke
npm test:e2e
npm test:e2e:ui
```

## Builder.io Component Registration

Components are automatically registered in `src/lib/builder-config.ts`. To add custom components:

```tsx
import { Builder } from "@builder.io/react";

Builder.registerComponent(YourComponent, {
  name: "YourComponent",
  inputs: [
    { name: "prop1", type: "string" },
    { name: "prop2", type: "number" },
  ],
});
```

## Debugging

### Enable Builder.io Debug Mode

```javascript
// In browser console
window.localStorage.setItem("builder.debug", "true");
```

### Check Builder.io Status

```bash
curl -s -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.builder.io/v1/me
```

## Troubleshooting

**Q: API Key not working?**
- Verify key in `.env.local`: `VITE_BUILDER_API_KEY=xxx`
- Restart dev server after changing env vars
- Check Builder.io dashboard for valid key

**Q: Hot reload not working?**
- Check Vite config: `ui/vite.config.ts`
- Ensure port 5173 is not in use
- Clear `.vite` cache: `rm -rf node_modules/.vite`

**Q: Builder.io components not showing?**
- Register components in `src/lib/builder-config.ts`
- Verify component props match Builder.io schema
- Check browser console for errors

## Next Steps

1. Register your custom components in Builder.io
2. Create content models in Builder.io dashboard
3. Link your live preview URL
4. Start editing components visually!

## Resources

- [Builder.io React Documentation](https://www.builder.io/docs/react)
- [Builder.io API Reference](https://www.builder.io/docs/api)
- [Visual Editing Guide](https://www.builder.io/docs/guides/visual-editing)
