import { Loader2, AlertCircle, Check, Moon, Sun, Server, Cloud, RefreshCw, Wrench } from "lucide-react";
import { useState, useEffect } from "react";
import {
  useSettings,
  useUpdateSettings,
  useAvailableModels,
} from "../hooks/useProjects";
import { useTheme, THEMES } from "../hooks/useTheme";
import { getOllamaModels, testOllamaConnection } from "../lib/api";
import { OllamaSetupWizard } from "./OllamaSetupWizard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { data: settings, isLoading, isError, refetch } = useSettings();
  const { data: modelsData } = useAvailableModels();
  const updateSettings = useUpdateSettings();
  const { theme, setTheme, darkMode, toggleDarkMode } = useTheme();
  
  const [ollamaModels, setOllamaModels] = useState<Array<{ name: string; size: number }>>([]);
  const [loadingOllamaModels, setLoadingOllamaModels] = useState(false);
  const [ollamaTestResult, setOllamaTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [localOllamaUrl, setLocalOllamaUrl] = useState("");
  const [localGeminiKey, setLocalGeminiKey] = useState("");
  const [showOllamaWizard, setShowOllamaWizard] = useState(false);

  // Sync local state with settings
  useEffect(() => {
    if (settings?.ollama_base_url) {
      setLocalOllamaUrl(settings.ollama_base_url);
    }
  }, [settings?.ollama_base_url]);

  // Load Ollama models when provider is local
  useEffect(() => {
    if (settings?.ai_provider === "local" && isOpen) {
      loadOllamaModels();
    }
  }, [settings?.ai_provider, isOpen]);

  const loadOllamaModels = async () => {
    setLoadingOllamaModels(true);
    try {
      const data = await getOllamaModels();
      setOllamaModels(data.models || []);
    } catch (error) {
      console.error("Failed to load Ollama models:", error);
      setOllamaModels([]);
    } finally {
      setLoadingOllamaModels(false);
    }
  };

  const handleTestOllama = async () => {
    setOllamaTestResult(null);
    try {
      const result = await testOllamaConnection();
      setOllamaTestResult(result);
      if (result.success) {
        loadOllamaModels();
      }
    } catch (error) {
      setOllamaTestResult({ success: false, message: String(error) });
    }
  };

  const handleYoloToggle = () => {
    if (settings && !updateSettings.isPending) {
      updateSettings.mutate({ yolo_mode: !settings.yolo_mode });
    }
  };

  const handleModelChange = (modelId: string) => {
    if (!updateSettings.isPending) {
      updateSettings.mutate({ model: modelId });
    }
  };

  const handleTestingRatioChange = (ratio: number) => {
    if (!updateSettings.isPending) {
      updateSettings.mutate({ testing_agent_ratio: ratio });
    }
  };
  
  const handleProviderChange = (provider: string) => {
    if (!updateSettings.isPending) {
      updateSettings.mutate({ ai_provider: provider });
    }
  };

  const handleOllamaUrlChange = () => {
    if (!updateSettings.isPending && localOllamaUrl) {
      updateSettings.mutate({ ollama_base_url: localOllamaUrl });
    }
  };

  const handleOllamaModelChange = (model: string) => {
    if (!updateSettings.isPending) {
      updateSettings.mutate({ ollama_model: model });
    }
  };

  const handleGeminiKeyChange = () => {
    if (!updateSettings.isPending && localGeminiKey) {
      updateSettings.mutate({ gemini_api_key: localGeminiKey });
    }
  };

  const models = modelsData?.models ?? [];
  const isSaving = updateSettings.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Settings
            {isSaving && <Loader2 className="animate-spin" size={16} />}
          </DialogTitle>
        </DialogHeader>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin" size={24} />
            <span className="ml-2">Loading settings...</span>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load settings
              <Button
                variant="link"
                onClick={() => refetch()}
                className="ml-2 p-0 h-auto"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Settings Content */}
        {settings && !isLoading && (
          <div className="space-y-6">
            {/* Appearance Section */}
            <div className="space-y-3">
              <Label className="font-medium">Appearance</Label>
              <div className="grid grid-cols-2 gap-3">
                {/* Theme Dropdown */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Theme</Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {THEMES.map((themeOption) => (
                        <SelectItem key={themeOption.id} value={themeOption.id}>
                          {themeOption.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dark Mode Toggle */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Mode</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleDarkMode}
                    className="gap-2 w-full"
                  >
                    {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                    {darkMode ? "Light" : "Dark"}
                  </Button>
                </div>
              </div>
            </div>

            <hr className="border-border" />

            {/* AI Provider Selection */}
            <div className="space-y-3">
              <Label className="font-medium">AI Provider</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleProviderChange("cloud")}
                  disabled={isSaving}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                    settings.ai_provider === "cloud"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  } ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <Cloud size={20} />
                  <div className="text-left">
                    <div className="font-medium text-sm">Cloud API</div>
                    <div className="text-xs text-muted-foreground">
                      Gemini, Claude, etc.
                    </div>
                  </div>
                  {settings.ai_provider === "cloud" && (
                    <Check size={16} className="ml-auto text-primary" />
                  )}
                </button>
                <button
                  onClick={() => handleProviderChange("local")}
                  disabled={isSaving}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                    settings.ai_provider === "local"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  } ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <Server size={20} />
                  <div className="text-left">
                    <div className="font-medium text-sm">Local Ollama</div>
                    <div className="text-xs text-muted-foreground">
                      Self-hosted models
                    </div>
                  </div>
                  {settings.ai_provider === "local" && (
                    <Check size={16} className="ml-auto text-primary" />
                  )}
                </button>
              </div>
              
              {/* Ollama Setup Wizard Button */}
              {settings.ai_provider === "local" && (
                <Button
                  onClick={() => setShowOllamaWizard(true)}
                  variant="outline"
                  className="w-full"
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Setup Ollama Assistant
                </Button>
              )}
            </div>

            {/* Ollama Configuration */}
            {settings.ai_provider === "local" && (
              <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                <div className="space-y-2">
                  <Label className="font-medium">Ollama URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={localOllamaUrl}
                      onChange={(e) => setLocalOllamaUrl(e.target.value)}
                      placeholder="http://localhost:11434"
                      className="flex-1"
                    />
                    <Button
                      onClick={handleOllamaUrlChange}
                      disabled={isSaving || !localOllamaUrl}
                      variant="outline"
                      size="sm"
                    >
                      Save
                    </Button>
                    <Button
                      onClick={handleTestOllama}
                      variant="outline"
                      size="sm"
                    >
                      Test
                    </Button>
                  </div>
                </div>

                {ollamaTestResult && (
                  <Alert variant={ollamaTestResult.success ? "default" : "destructive"}>
                    <AlertDescription>
                      {ollamaTestResult.message}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">Available Models</Label>
                    <Button
                      onClick={loadOllamaModels}
                      disabled={loadingOllamaModels}
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1"
                    >
                      <RefreshCw size={14} className={loadingOllamaModels ? "animate-spin" : ""} />
                      Refresh
                    </Button>
                  </div>
                  
                  {loadingOllamaModels ? (
                    <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                      <Loader2 className="animate-spin mr-2" size={16} />
                      Loading models...
                    </div>
                  ) : ollamaModels.length > 0 ? (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {ollamaModels.map((model) => (
                        <button
                          key={model.name}
                          onClick={() => handleOllamaModelChange(model.name)}
                          disabled={isSaving}
                          className={`w-full flex items-center justify-between p-2 rounded border transition-colors ${
                            settings.ollama_model === model.name
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50 hover:bg-muted/50"
                          } ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <span className="font-mono text-sm">{model.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {(model.size / 1024 / 1024 / 1024).toFixed(1)} GB
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No models found. Make sure Ollama is running and has models installed.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cloud API Model Selection */}
            {settings.ai_provider === "cloud" && (
              <div className="space-y-3">
                <Label className="font-medium">Cloud API Model</Label>
                
                {/* Claude API */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Claude (Anthropic)</Label>
                  <div className="grid gap-2">
                    {models
                      .filter((model) => model.id.includes("claude"))
                      .map((model) => (
                        <button
                          key={model.id}
                          onClick={() => handleModelChange(model.id)}
                          disabled={isSaving}
                          className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors text-left ${
                            settings.model === model.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50 hover:bg-muted/50"
                          } ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <span className="text-sm font-medium">{model.name}</span>
                          {settings.model === model.id && (
                            <Check size={16} className="text-primary" />
                          )}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Gemini API */}
                {models.some((model) => model.id.includes("gemini")) && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Gemini (Google)</Label>
                    <div className="grid gap-2">
                      {models
                        .filter((model) => model.id.includes("gemini"))
                        .map((model) => (
                          <button
                            key={model.id}
                            onClick={() => handleModelChange(model.id)}
                            disabled={isSaving}
                            className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors text-left ${
                              settings.model === model.id
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50 hover:bg-muted/50"
                            } ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            <span className="text-sm font-medium">{model.name}</span>
                            {settings.model === model.id && (
                              <Check size={16} className="text-primary" />
                            )}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
                
                {/* Gemini API Key Configuration */}
                {models.some((model) => model.id.includes("gemini")) && (
                  <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
                    <Label className="text-xs font-medium">Gemini API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value={localGeminiKey}
                        onChange={(e) => setLocalGeminiKey(e.target.value)}
                        placeholder={settings.gemini_api_key ? "••••••••" : "Enter your Gemini API key"}
                        className="flex-1 font-mono text-sm"
                      />
                      <Button
                        onClick={handleGeminiKeyChange}
                        disabled={isSaving || !localGeminiKey}
                        variant="outline"
                        size="sm"
                      >
                        Save
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Get your API key from{" "}
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Google AI Studio
                      </a>
                    </p>
                  </div>
                )}
              </div>
            )}

            <hr className="border-border" />
            
            {/* YOLO Mode Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="yolo-mode" className="font-medium">
                  YOLO Mode
                </Label>
                <p className="text-sm text-muted-foreground">
                  Skip testing for rapid prototyping
                </p>
              </div>
              <Switch
                id="yolo-mode"
                checked={settings.yolo_mode}
                onCheckedChange={handleYoloToggle}
                disabled={isSaving}
              />
            </div>

            {/* Regression Agents */}
            <div className="space-y-2">
              <Label className="font-medium">Regression Agents</Label>
              <p className="text-sm text-muted-foreground">
                Number of regression testing agents (0 = disabled)
              </p>
              <div className="flex rounded-lg border overflow-hidden">
                {[0, 1, 2, 3].map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => handleTestingRatioChange(ratio)}
                    disabled={isSaving}
                    className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
                      settings.testing_agent_ratio === ratio
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-foreground hover:bg-muted"
                    } ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Update Error */}
            {updateSettings.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  Failed to save settings. Please try again.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </DialogContent>

      {/* Ollama Setup Wizard Dialog */}
      <Dialog open={showOllamaWizard} onOpenChange={setShowOllamaWizard}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ollama Setup Assistant</DialogTitle>
          </DialogHeader>
          <OllamaSetupWizard 
            onComplete={() => {
              setShowOllamaWizard(false);
              refetch(); // Reload settings
              loadOllamaModels(); // Reload models
            }} 
          />
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
