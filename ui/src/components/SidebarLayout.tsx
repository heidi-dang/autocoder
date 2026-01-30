import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarLayoutProps {
  sidebar: React.ReactNode;
  content: React.ReactNode;
  overlays?: React.ReactNode;
}

export function SidebarLayout({
  sidebar,
  content,
  overlays,
}: SidebarLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* Top Header - always visible */}
      <div className="h-16 border-b border-border flex items-center justify-between px-4 bg-card/50 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hover:bg-primary/10"
        >
          {sidebarOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div
          className={cn(
            "border-r border-border bg-card/30 backdrop-blur-sm transition-all duration-300 ease-in-out overflow-y-auto",
            sidebarOpen ? "w-64" : "w-0",
            isMobile && sidebarOpen ? "fixed inset-y-16 left-0 z-40 w-64" : ""
          )}
        >
          {sidebarOpen && <div className="p-4">{sidebar}</div>}
        </div>

        {/* Mobile Overlay */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 top-16"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="h-full">{content}</div>
        </div>
      </div>

      {/* Overlays (modals, panels, etc.) */}
      {overlays}
    </div>
  );
}
