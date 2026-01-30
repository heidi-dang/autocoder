import { useState, useEffect } from "react";
import { Box, Cloud, AlertCircle, Check, Loader2 } from "lucide-react";
import { useSettings, useUpdateSettings } from "../hooks/useProjects";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SandboxSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SandboxSettingsModal({ isOpen, onClose }: SandboxSettingsModalProps) {
  const { data: settings, isLoading, refetch } = useSettings();
  const updateSettings = useUpdateSettings();

  const [useSandbox, setUseSandbox] = useState(false);
  const [sandboxImageSize, setSandboxImageSize] = useState("10gb");
  const [sandboxMemory, setSandboxMemory] = useState("4gb");
  const [sandboxTimeout, setSandboxTimeout] = useState("3600");
  const [autoCleanup, setAutoCleanup] = useState(true);
  const [testStatus, setTestStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Sync local state with settings
  useEffect(() => {
    if (settings) {
      setUseSandbox(settings.use_sandbox || false);
      setSandboxImageSize(settings.sandbox_image_size || "10gb");
      setSandboxMemory(settings.sandbox_memory || "4gb");
      setSandboxTimeout(settings.sandbox_timeout || "3600");
      setAutoCleanup(settings.sandbox_auto_cleanup !== false);
    }
  }, [settings]);

  const handleSaveSettings = () => {
    if (updateSettings.isPending) return;

    updateSettings.mutate({
      use_sandbox: useSandbox,
      sandbox_image_size: sandboxImageSize,
      sandbox_memory: sandboxMemory,
      sandbox_timeout: sandboxTimeout,
      sandbox_auto_cleanup: autoCleanup,
    });

    onClose();
  };

  const handleTestSandbox = async () => {
    setIsTesting(true);
    setTestStatus(null);
    try {
      const response = await fetch("/api/sandbox/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          use_sandbox: useSandbox,
          sandbox_image_size: sandboxImageSize,
          sandbox_memory: sandboxMemory,
        }),
      });

      const result = await response.json();
      setTestStatus({
        success: response.ok,
        message: result.message || (response.ok ? "Sandbox is working!" : "Sandbox test failed"),
      });
    } catch (error) {
      setTestStatus({
        success: false,
        message: error instanceof Error ? error.message : "Failed to test sandbox",
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Box size={20} />
            Sandbox Settings
          </DialogTitle>
          <DialogDescription>
            Configure sandbox environment for code execution or develop directly on your physical machine
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="test">Test</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Choose whether to run code in an isolated sandbox environment or directly on your machine.
              </AlertDescription>
            </Alert>

            {/* Sandbox Toggle */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <Box size={20} className="text-blue-500" />
                  <div>
                    <Label className="text-base font-semibold cursor-pointer">
                      Use Sandbox Environment
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Run code in isolated containers with resource limits
                    </p>
                  </div>
                </div>
                <Switch checked={useSandbox} onCheckedChange={setUseSandbox} />
              </div>

              {!useSandbox && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Running code directly on your machine. Be careful with untrusted code as it will have full access to your system.
                  </AlertDescription>
                </Alert>
              )}

              {useSandbox && (
                <Alert>
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    Sandbox mode enabled. Code execution is isolated and resource-limited.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Mode Description */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center gap-2 mb-2">
                  <Cloud size={18} className="text-blue-600" />
                  <h4 className="font-semibold text-sm">Sandbox Mode</h4>
                </div>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>✓ Isolated execution</li>
                  <li>✓ Resource limits</li>
                  <li>✓ Safe from crashes</li>
                  <li>✓ Slower execution</li>
                </ul>
              </div>

              <div className="p-4 border rounded-lg bg-orange-50 dark:bg-orange-900/20">
                <div className="flex items-center gap-2 mb-2">
                  <Box size={18} className="text-orange-600" />
                  <h4 className="font-semibold text-sm">Direct Execution</h4>
                </div>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>✓ Full system access</li>
                  <li>✓ Fast execution</li>
                  <li>✓ No overhead</li>
                  <li>✗ Risky with untrusted code</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-6">
            {useSandbox && (
              <>
                {/* Docker Image Size */}
                <div className="space-y-2">
                  <Label htmlFor="image-size" className="text-base font-semibold">
                    Sandbox Image Size
                  </Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Maximum size for sandbox container images
                  </p>
                  <Select value={sandboxImageSize} onValueChange={setSandboxImageSize}>
                    <SelectTrigger id="image-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5gb">5 GB (Small)</SelectItem>
                      <SelectItem value="10gb">10 GB (Medium)</SelectItem>
                      <SelectItem value="20gb">20 GB (Large)</SelectItem>
                      <SelectItem value="50gb">50 GB (Extra Large)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Memory Limit */}
                <div className="space-y-2">
                  <Label htmlFor="memory" className="text-base font-semibold">
                    Memory Limit
                  </Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Maximum RAM allocation per sandbox container
                  </p>
                  <Select value={sandboxMemory} onValueChange={setSandboxMemory}>
                    <SelectTrigger id="memory">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1gb">1 GB</SelectItem>
                      <SelectItem value="2gb">2 GB</SelectItem>
                      <SelectItem value="4gb">4 GB</SelectItem>
                      <SelectItem value="8gb">8 GB</SelectItem>
                      <SelectItem value="16gb">16 GB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Timeout */}
                <div className="space-y-2">
                  <Label htmlFor="timeout" className="text-base font-semibold">
                    Execution Timeout (seconds)
                  </Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Maximum time to wait for sandbox task completion
                  </p>
                  <Input
                    id="timeout"
                    type="number"
                    min="60"
                    max="86400"
                    value={sandboxTimeout}
                    onChange={(e) => setSandboxTimeout(e.target.value)}
                    placeholder="3600"
                  />
                </div>

                {/* Auto Cleanup */}
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <div>
                    <Label className="text-base font-semibold cursor-pointer">
                      Auto-cleanup Containers
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Automatically remove stopped containers to save disk space
                    </p>
                  </div>
                  <Switch checked={autoCleanup} onCheckedChange={setAutoCleanup} />
                </div>
              </>
            )}

            {!useSandbox && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Advanced sandbox settings are disabled when using direct execution mode.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Test Tab */}
          <TabsContent value="test" className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Test your current sandbox configuration to ensure everything is working correctly.
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleTestSandbox}
              disabled={isTesting}
              className="w-full"
              variant="outline"
            >
              {isTesting ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Sandbox Configuration"
              )}
            </Button>

            {testStatus && (
              <Alert variant={testStatus.success ? "default" : "destructive"}>
                <div className="flex items-center gap-2">
                  {testStatus.success ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>{testStatus.message}</AlertDescription>
                </div>
              </Alert>
            )}

            <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg text-sm font-mono space-y-2">
              <p className="text-muted-foreground">Configuration Summary:</p>
              <div className="space-y-1 text-xs">
                <p>• Sandbox Enabled: <span className="text-blue-600 dark:text-blue-400">{useSandbox ? "Yes" : "No"}</span></p>
                {useSandbox && (
                  <>
                    <p>• Image Size: <span className="text-blue-600 dark:text-blue-400">{sandboxImageSize}</span></p>
                    <p>• Memory: <span className="text-blue-600 dark:text-blue-400">{sandboxMemory}</span></p>
                    <p>• Timeout: <span className="text-blue-600 dark:text-blue-400">{sandboxTimeout}s</span></p>
                    <p>• Auto-cleanup: <span className="text-blue-600 dark:text-blue-400">{autoCleanup ? "Enabled" : "Disabled"}</span></p>
                  </>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialog Footer */}
        <div className="flex gap-2 justify-end pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveSettings}
            disabled={updateSettings.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {updateSettings.isPending ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
