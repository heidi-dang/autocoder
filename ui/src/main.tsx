import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./styles/globals.css";
import { initSentry } from "./lib/sentry";
import { BuilderProvider } from "./lib/builder-provider";
// Note: Custom theme removed - using shadcn/ui theming instead

initSentry();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BuilderProvider apiKey={import.meta.env.VITE_BUILDER_API_KEY}>
        <App />
      </BuilderProvider>
    </QueryClientProvider>
  </StrictMode>,
);
