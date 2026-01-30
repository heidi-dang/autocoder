import {
  Plus,
  ChevronRight,
  Settings,
  Moon,
  Sun,
  Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { Feature, FeatureListResponse } from "../lib/types";
import { cn } from "@/lib/utils";

interface SidebarContentProps {
  projects: Array<{ name: string; has_spec: boolean }> | undefined;
  selectedProject: string | null;
  onSelectProject: (project: string | null) => void;
  features: FeatureListResponse | undefined;
  selectedFeature: Feature | null;
  onSelectFeature: (feature: Feature | null) => void;
  onAddFeature?: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSettings?: () => void;
}

export function SidebarContent({
  projects,
  selectedProject,
  onSelectProject,
  features,
  selectedFeature,
  onSelectFeature,
  onAddFeature,
  darkMode,
  onToggleDarkMode,
  onOpenSettings,
}: SidebarContentProps) {
  const allFeatures = features
    ? [
        ...features.pending.map((f) => ({ ...f, status: "pending" as const })),
        ...features.in_progress.map((f) => ({
          ...f,
          status: "in_progress" as const,
        })),
        ...features.done.map((f) => ({ ...f, status: "done" as const })),
      ]
    : [];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-card/50 to-card/30">
      {/* Projects Section */}
      <div className="flex-shrink-0 p-4">
        <h2 className="text-sm font-semibold text-foreground/80 mb-4">Projects</h2>

        <div className="space-y-2 mb-4">
          {!projects ? (
            <div className="text-xs text-muted-foreground animate-pulse">
              Loading...
            </div>
          ) : projects.length === 0 ? (
            <div className="text-xs text-muted-foreground">No projects</div>
          ) : (
            projects.map((project) => (
              <button
                key={project.name}
                onClick={() => onSelectProject(project.name)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                  selectedProject === project.name
                    ? "bg-primary/20 text-primary border border-primary/30 shadow-md shadow-primary/20"
                    : "text-foreground/70 hover:bg-primary/10 border border-transparent"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{project.name}</span>
                  {selectedProject === project.name && (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <Separator className="bg-border/30" />

      {/* Features Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-shrink-0 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground/80">
              Features
            </h2>
            {selectedProject && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onAddFeature}
                className="h-6 w-6 p-0 hover:bg-primary/10"
              >
                <Plus className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {selectedProject && features ? (
          <ScrollArea className="flex-1">
            <div className="px-4 space-y-2 pb-4">
              {allFeatures.length === 0 ? (
                <div className="text-xs text-muted-foreground py-2">
                  No features yet
                </div>
              ) : (
                allFeatures.map((feature) => {
                  const statusColor = {
                    pending: "bg-yellow-500/20 border-yellow-500/30",
                    in_progress: "bg-cyan-500/20 border-cyan-500/30",
                    done: "bg-green-500/20 border-green-500/30",
                  }[feature.status];

                  const statusDot = {
                    pending: "bg-yellow-500",
                    in_progress: "bg-cyan-500",
                    done: "bg-green-500",
                  }[feature.status];

                  return (
                    <button
                      key={feature.id}
                      onClick={() => onSelectFeature(feature)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md text-xs transition-all duration-200 border",
                        selectedFeature?.id === feature.id
                          ? "bg-primary/30 border-primary/50 shadow-md shadow-primary/20"
                          : `${statusColor} hover:opacity-80`
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full flex-shrink-0 mt-1",
                            statusDot
                          )}
                        />
                        <span className="truncate font-medium text-foreground/80">
                          {feature.name}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        ) : selectedProject ? (
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="text-xs text-muted-foreground text-center">
              Loading features...
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="text-xs text-muted-foreground text-center">
              Select a project
            </div>
          </div>
        )}
      </div>

      <Separator className="bg-border/30" />

      {/* Settings Section */}
      <div className="flex-shrink-0 p-4 space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleDarkMode}
          className="w-full justify-start gap-2 border-border/30 hover:bg-primary/10"
        >
          {darkMode ? (
            <>
              <Sun className="w-4 h-4" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4" />
              <span>Dark Mode</span>
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenSettings}
          className="w-full justify-start gap-2 border-border/30 hover:bg-primary/10"
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </Button>

        <div className="pt-2 text-xs text-muted-foreground/60 text-center">
          <div className="flex items-center justify-center gap-1">
            <Server className="w-3 h-3" />
            <span>AutoCoder</span>
          </div>
        </div>
      </div>
    </div>
  );
}
