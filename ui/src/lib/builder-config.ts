/**
 * Builder.io Configuration
 * Initialize and configure Builder.io for visual editing
 */

export const initBuilder = () => {
  // Get API key from environment
  const apiKey = import.meta.env.VITE_BUILDER_API_KEY;

  if (!apiKey) {
    console.warn(
      "Builder.io API key not configured. Set VITE_BUILDER_API_KEY to enable visual editing."
    );
    return null;
  }

  // Configure Builder.io
  const config = {
    apiKey,
    previewUrl: window.location.origin,
    editingUrl: `${window.location.origin}?builder.edit=true`,
    models: [
      {
        name: "quickchat",
        displayName: "QuickChat Component",
        description: "AI-powered quick chat interface",
        screenshot: "https://cdn.builder.io/api/v1/image/assets%2Fcdc...png",
      },
      {
        name: "page",
        displayName: "Page",
        description: "Custom page content",
      },
    ],
  };

  return config;
};

/**
 * Builder.io Component Registration
 * Register custom components for use in Builder Studio
 */
export const registerBuilderComponents = async () => {
  // Dynamic import to avoid build errors if @builder.io/react not installed
  try {
    // Builder component registration would go here
    // For now, this is a placeholder to prevent build errors
    return true;
  } catch (error) {
    console.warn("Builder.io SDK not available:", error);
    return false;
  }
};

/**
 * Get Builder content by model and URL
 */
export async function getBuilderContent(
  model: string,
  url: string,
  apiKey: string
) {
  const query = new URLSearchParams({
    apiKey,
    model,
    url,
    format: "react",
  });

  try {
    const response = await fetch(
      `https://builder.io/api/v1/content?${query.toString()}`
    );
    if (!response.ok) throw new Error("Failed to fetch Builder content");
    return await response.json();
  } catch (error) {
    console.error("Error fetching Builder content:", error);
    return null;
  }
}
