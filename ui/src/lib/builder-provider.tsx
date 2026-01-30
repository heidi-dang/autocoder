import { ReactNode, useEffect, useState } from "react";

interface BuilderProviderProps {
  children: ReactNode;
  apiKey?: string;
}

/**
 * Builder.io Provider Component
 * Wraps your app to enable Builder.io visual editing and content delivery
 */
export function BuilderProvider({ children, apiKey }: BuilderProviderProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initBuilderIO = async () => {
      // Only load Builder.io if API key is provided
      if (!apiKey) {
        setIsReady(true);
        return;
      }

      try {
        // Dynamically load Builder.io SDK
        const script = document.createElement("script");
        script.src = "https://cdn.builder.io/js/builder";
        script.async = true;
        script.onload = () => {
          // Initialize Builder.io with your API key
          if (window.Builder) {
            window.Builder.init(apiKey);
          }
          setIsReady(true);
        };
        script.onerror = () => {
          console.warn("Failed to load Builder.io SDK");
          setIsReady(true);
        };
        document.head.appendChild(script);
      } catch (error) {
        console.error("Builder.io initialization error:", error);
        setIsReady(true);
      }
    };

    initBuilderIO();
  }, [apiKey]);

  if (!isReady) {
    return <div>Initializing Builder.io...</div>;
  }

  return <>{children}</>;
}

declare global {
  interface Window {
    Builder?: {
      init: (apiKey: string) => void;
      // Add other Builder methods as needed
    };
  }
}
