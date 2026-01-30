import { useState, useEffect, useCallback } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  useProjects,
  useFeatures,
  useAgentStatus,
  useSettings,
} from "./hooks/useProjects";
import { useProjectWebSocket } from "./hooks/useWebSocket";
import { useFeatureSound } from "./hooks/useFeatureSound";
import { useCelebration } from "./hooks/useCelebration";
import { useTheme } from "./hooks/useTheme";
import { SidebarLayout } from "./components/SidebarLayout";
import { SidebarContent } from "./components/SidebarContent";
import { ProjectSelector } from "./components/ProjectSelector";
import { KanbanBoard } from "./components/KanbanBoard";
import { AgentControl } from "./components/AgentControl";
import { ProgressDashboard } from "./components/ProgressDashboard";
import { SetupWizard } from "./components/SetupWizard";
import { AddFeatureForm } from "./components/AddFeatureForm";
import { FeatureModal } from "./components/FeatureModal";
import { DebugLogViewer, type TabType } from "./components/DebugLogViewer";
import { AgentThought } from "./components/AgentThought";
import { AgentMissionControl } from "./components/AgentMissionControl";
import { CelebrationOverlay } from "./components/CelebrationOverlay";
import { AssistantFAB } from "./components/AssistantFAB";
import { AssistantPanel } from "./components/AssistantPanel";
import { ExpandProjectModal } from "./components/ExpandProjectModal";
import { SpecCreationChat } from "./components/SpecCreationChat";
import { SettingsModal } from "./components/SettingsModal";
import { DevServerControl } from "./components/DevServerControl";
import { ViewToggle, type ViewMode } from "./components/ViewToggle";
import { DependencyGraph } from "./components/DependencyGraph";
import { KeyboardShortcutsHelp } from "./components/KeyboardShortcutsHelp";
import { ThemeSelector } from "./components/ThemeSelector";
import { getDependencyGraph } from "./lib/api";
import { Loader2, Settings, Moon, Sun, Server } from "lucide-react";
import type { Feature } from "./lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QuickChat } from "./components/QuickChat";
import { setSentryProject } from "./lib/sentry";

const STORAGE_KEY = "autocoder-selected-project";
const VIEW_MODE_KEY = "autocoder-view-mode";

function App() {
  // Initialize selected project from localStorage
  const [selectedProject, setSelectedProject] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [showAddFeature, setShowAddFeature] = useState(false);
  const [showExpandProject, setShowExpandProject] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [setupComplete, setSetupComplete] = useState(true);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugPanelHeight, setDebugPanelHeight] = useState(288);
  const [debugActiveTab, setDebugActiveTab] = useState<TabType>("agent");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [isSpecCreating, setIsSpecCreating] = useState(false);
  const [showSpecChat, setShowSpecChat] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const stored = localStorage.getItem(VIEW_MODE_KEY);
      return (stored === "graph" ? "graph" : "kanban") as ViewMode;
    } catch {
      return "kanban";
    }
  });

  const queryClient = useQueryClient();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: features } = useFeatures(selectedProject);
  const { data: settings } = useSettings();
  useAgentStatus(selectedProject);
  const wsState = useProjectWebSocket(selectedProject);
  const { theme, setTheme, darkMode, toggleDarkMode, themes } = useTheme();

  const selectedProjectData = projects?.find((p) => p.name === selectedProject);
  const hasSpec = selectedProjectData?.has_spec ?? true;

  const { data: graphData } = useQuery({
    queryKey: ["dependencyGraph", selectedProject],
    queryFn: () => getDependencyGraph(selectedProject!),
    enabled: !!selectedProject && viewMode === "graph",
    refetchInterval: 5000,
  });

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch {
      // localStorage not available
    }
  }, [viewMode]);

  useFeatureSound(features);
  useCelebration(features, selectedProject);

  const handleSelectProject = useCallback((project: string | null) => {
    setSelectedProject(project);
    try {
      if (project) {
        localStorage.setItem(STORAGE_KEY, project);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  useEffect(() => {
    setSentryProject(selectedProject);
  }, [selectedProject]);

  const handleGraphNodeClick = useCallback(
    (nodeId: number) => {
      const allFeatures = [
        ...(features?.pending ?? []),
        ...(features?.in_progress ?? []),
        ...(features?.done ?? []),
      ];
      const feature = allFeatures.find((f) => f.id === nodeId);
      if (feature) setSelectedFeature(feature);
    },
    [features],
  );

  useEffect(() => {
    if (
      selectedProject &&
      projects &&
      !projects.some((p) => p.name === selectedProject)
    ) {
      handleSelectProject(null);
    }
  }, [selectedProject, projects, handleSelectProject]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        setDebugOpen((prev) => !prev);
      }

      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        if (!debugOpen) {
          setDebugOpen(true);
          setDebugActiveTab("terminal");
        } else if (debugActiveTab === "terminal") {
          setDebugOpen(false);
        } else {
          setDebugActiveTab("terminal");
        }
      }

      if ((e.key === "n" || e.key === "N") && selectedProject) {
        e.preventDefault();
        setShowAddFeature(true);
      }

      if (
        (e.key === "e" || e.key === "E") &&
        selectedProject &&
        features &&
        features.pending.length +
          features.in_progress.length +
          features.done.length >
          0
      ) {
        e.preventDefault();
        setShowExpandProject(true);
      }

      if (
        (e.key === "a" || e.key === "A") &&
        selectedProject &&
        !isSpecCreating
      ) {
        e.preventDefault();
        setAssistantOpen((prev) => !prev);
      }

      if (e.key === ",") {
        e.preventDefault();
        setShowSettings(true);
      }

      if ((e.key === "g" || e.key === "G") && selectedProject) {
        e.preventDefault();
        setViewMode((prev) => (prev === "kanban" ? "graph" : "kanban"));
      }

      if (e.key === "?") {
        e.preventDefault();
        setShowKeyboardHelp(true);
      }

      if (e.key === "Escape") {
        if (showKeyboardHelp) {
          setShowKeyboardHelp(false);
        } else if (showExpandProject) {
          setShowExpandProject(false);
        } else if (showSettings) {
          setShowSettings(false);
        } else if (assistantOpen) {
          setAssistantOpen(false);
        } else if (showAddFeature) {
          setShowAddFeature(false);
        } else if (selectedFeature) {
          setSelectedFeature(null);
        } else if (debugOpen) {
          setDebugOpen(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedProject,
    showAddFeature,
    showExpandProject,
    selectedFeature,
    debugOpen,
    debugActiveTab,
    assistantOpen,
    features,
    showSettings,
    showKeyboardHelp,
    isSpecCreating,
    viewMode,
  ]);

  const progress =
    wsState.progress.total > 0
      ? wsState.progress
      : {
          passing: features?.done.length ?? 0,
          total:
            (features?.pending.length ?? 0) +
            (features?.in_progress.length ?? 0) +
            (features?.done.length ?? 0),
          percentage: 0,
        };

  if (progress.total > 0 && progress.percentage === 0) {
    progress.percentage =
      Math.round((progress.passing / progress.total) * 100 * 10) / 10;
  }

  if (!setupComplete) {
    return <SetupWizard onComplete={() => setSetupComplete(true)} />;
  }

  return (
    <SidebarLayout
      sidebar={
        <SidebarContent
          projects={projects}
          selectedProject={selectedProject}
          onSelectProject={handleSelectProject}
          features={features}
          selectedFeature={selectedFeature}
          onSelectFeature={setSelectedFeature}
          onAddFeature={() => setShowAddFeature(true)}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          onOpenSettings={() => setShowSettings(true)}
        />
      }
      content={
        <div className="flex flex-col h-full overflow-auto">
          <div className="flex-shrink-0 bg-card/50 border-b border-border px-6 py-4 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                {selectedProject && (
                  <h2 className="text-lg font-semibold text-foreground">
                    {selectedProject}
                  </h2>
                )}
              </div>

              {selectedProject && (
                <div className="flex items-center gap-3">
                  <AgentControl
                    projectName={selectedProject}
                    status={wsState.agentStatus}
                  />

                  <DevServerControl
                    projectName={selectedProject}
                    status={wsState.devServerStatus}
                    url={wsState.devServerUrl}
                  />

                  {settings?.ai_provider === "local" &&
                    settings?.ollama_model && (
                      <div
                        className="flex items-center gap-1.5 px-2 py-1.5 bg-primary/10 rounded border border-primary/20 text-xs"
                        title={`Using Local Ollama: ${settings.ollama_model}`}
                      >
                        <Server size={14} className="text-primary" />
                        <span className="font-medium text-primary">
                          {settings.ollama_model}
                        </span>
                      </div>
                    )}

                  <ThemeSelector
                    themes={themes}
                    currentTheme={theme}
                    onThemeChange={setTheme}
                  />
                </div>
              )}
            </div>
          </div>

          <div
            className="flex-1 overflow-auto px-6 py-8"
            style={{
              paddingBottom: debugOpen ? debugPanelHeight + 32 : undefined,
            }}
          >
            {!selectedProject ? (
              <div className="space-y-8 mt-12 max-w-3xl mx-auto">
                <div className="text-center">
                  <h2 className="font-display text-2xl font-bold mb-2">
                    Welcome to AutoCoder
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    Select a project from the sidebar or create a new one to get
                    started.
                  </p>
                </div>

                <QuickChat />
              </div>
            ) : (
              <div className="space-y-8 max-w-6xl">
                <ProgressDashboard
                  passing={progress.passing}
                  total={progress.total}
                  percentage={progress.percentage}
                  isConnected={wsState.isConnected}
                />

                <AgentMissionControl
                  agents={wsState.activeAgents}
                  orchestratorStatus={wsState.orchestratorStatus}
                  recentActivity={wsState.recentActivity}
                  getAgentLogs={wsState.getAgentLogs}
                />

                {wsState.activeAgents.length === 0 && (
                  <AgentThought
                    logs={wsState.logs}
                    agentStatus={wsState.agentStatus}
                  />
                )}

                {features &&
                  features.pending.length === 0 &&
                  features.in_progress.length === 0 &&
                  features.done.length === 0 &&
                  wsState.agentStatus === "running" && (
                    <Card className="p-8 text-center">
                      <CardContent className="p-0">
                        <Loader2
                          size={32}
                          className="animate-spin mx-auto mb-4 text-primary"
                        />
                        <h3 className="font-display font-bold text-xl mb-2">
                          Initializing Features...
                        </h3>
                        <p className="text-muted-foreground">
                          The agent is reading your spec and creating features.
                          This may take a moment.
                        </p>
                      </CardContent>
                    </Card>
                  )}

                {features &&
                  features.pending.length +
                    features.in_progress.length +
                    features.done.length >
                    0 && (
                    <div className="flex justify-center">
                      <ViewToggle
                        viewMode={viewMode}
                        onViewModeChange={setViewMode}
                      />
                    </div>
                  )}

                {viewMode === "kanban" ? (
                  <KanbanBoard
                    features={features}
                    onFeatureClick={setSelectedFeature}
                    onAddFeature={() => setShowAddFeature(true)}
                    onExpandProject={() => setShowExpandProject(true)}
                    activeAgents={wsState.activeAgents}
                    onCreateSpec={() => setShowSpecChat(true)}
                    hasSpec={hasSpec}
                  />
                ) : (
                  <Card className="overflow-hidden" style={{ height: "600px" }}>
                    {graphData ? (
                      <DependencyGraph
                        graphData={graphData}
                        onNodeClick={handleGraphNodeClick}
                        activeAgents={wsState.activeAgents}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <Loader2
                          size={32}
                          className="animate-spin text-primary"
                        />
                      </div>
                    )}
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      }
      overlays={
        <>
          {showAddFeature && selectedProject && (
            <AddFeatureForm
              projectName={selectedProject}
              onClose={() => setShowAddFeature(false)}
            />
          )}

          {selectedFeature && selectedProject && (
            <FeatureModal
              feature={selectedFeature}
              projectName={selectedProject}
              onClose={() => setSelectedFeature(null)}
            />
          )}

          {showExpandProject && selectedProject && (
            <ExpandProjectModal
              isOpen={showExpandProject}
              projectName={selectedProject}
              onClose={() => setShowExpandProject(false)}
              onFeaturesAdded={() => {
                queryClient.invalidateQueries({
                  queryKey: ["features", selectedProject],
                });
              }}
            />
          )}

          {showSpecChat && selectedProject && (
            <div className="fixed inset-0 z-50 bg-background">
              <SpecCreationChat
                projectName={selectedProject}
                onComplete={() => {
                  setShowSpecChat(false);
                  queryClient.invalidateQueries({ queryKey: ["projects"] });
                  queryClient.invalidateQueries({
                    queryKey: ["features", selectedProject],
                  });
                }}
                onCancel={() => setShowSpecChat(false)}
                onExitToProject={() => setShowSpecChat(false)}
              />
            </div>
          )}

          {selectedProject && (
            <DebugLogViewer
              logs={wsState.logs}
              devLogs={wsState.devLogs}
              isOpen={debugOpen}
              onToggle={() => setDebugOpen(!debugOpen)}
              onClear={wsState.clearLogs}
              onClearDevLogs={wsState.clearDevLogs}
              onHeightChange={setDebugPanelHeight}
              projectName={selectedProject}
              activeTab={debugActiveTab}
              onTabChange={setDebugActiveTab}
            />
          )}

          {selectedProject &&
            !showExpandProject &&
            !isSpecCreating &&
            !showSpecChat && (
              <>
                <AssistantFAB
                  onClick={() => setAssistantOpen(!assistantOpen)}
                  isOpen={assistantOpen}
                />
                <AssistantPanel
                  projectName={selectedProject}
                  isOpen={assistantOpen}
                  onClose={() => setAssistantOpen(false)}
                />
              </>
            )}

          <SettingsModal
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
          />

          <KeyboardShortcutsHelp
            isOpen={showKeyboardHelp}
            onClose={() => setShowKeyboardHelp(false)}
          />

          {wsState.celebration && (
            <CelebrationOverlay
              agentName={wsState.celebration.agentName}
              featureName={wsState.celebration.featureName}
              onComplete={wsState.clearCelebration}
            />
          )}

          <ProjectSelector
            projects={projects ?? []}
            selectedProject={selectedProject}
            onSelectProject={handleSelectProject}
            isLoading={projectsLoading}
            onSpecCreatingChange={setIsSpecCreating}
            style={{ display: "none" }}
          />
        </>
      }
    />
  );
}

export default App;
