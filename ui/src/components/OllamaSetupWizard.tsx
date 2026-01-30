import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  XCircle,
  Download,
  RefreshCw,
  Terminal,
  AlertCircle,
  Loader2,
  Server,
  PlayCircle,
} from 'lucide-react';

interface OllamaStatus {
  installed: boolean;
  running: boolean;
  version: string | null;
  base_url: string;
  models_count: number;
  models: Array<{ name: string; size: number; modified_at: string }>;
  connection_url: string;
  issues: string[];
  recommendations: string[];
}

interface RecommendedModel {
  name: string;
  size: string;
  description: string;
  use_case: string;
}

interface InstallScript {
  system: {
    os: string;
    os_version: string;
    machine: string;
  };
  script: string;
  instructions: string[];
}

type SetupStep = 'check' | 'install' | 'models' | 'configure' | 'complete';

export function OllamaSetupWizard({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState<SetupStep>('check');
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installScript, setInstallScript] = useState<InstallScript | null>(null);
  const [recommendedModels, setRecommendedModels] = useState<RecommendedModel[]>([]);
  const [downloadingModel, setDownloadingModel] = useState<string | null>(null);

  const API_BASE = 'http://localhost:8888';

  const checkStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/ollama/status`);
      if (!res.ok) throw new Error('Failed to check Ollama status');
      const data = await res.json();
      setStatus(data);

      // Determine next step based on status
      if (!data.installed) {
        setCurrentStep('install');
      } else if (!data.running) {
        setCurrentStep('install'); // Show start service option
      } else if (data.models_count === 0) {
        setCurrentStep('models');
      } else {
        setCurrentStep('configure');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchInstallScript = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/ollama/install-script`);
      if (!res.ok) throw new Error('Failed to fetch install script');
      const data = await res.json();
      setInstallScript(data);
    } catch (err: any) {
      console.error('Error fetching install script:', err);
    }
  };

  const fetchRecommendedModels = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/ollama/recommended-models`);
      if (!res.ok) throw new Error('Failed to fetch recommended models');
      const data = await res.json();
      setRecommendedModels(data.recommended);
    } catch (err: any) {
      console.error('Error fetching recommended models:', err);
    }
  };

  useEffect(() => {
    checkStatus();
    fetchInstallScript();
    fetchRecommendedModels();
  }, []);

  const handleInstall = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/ollama/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_install: true }),
      });
      const data = await res.json();

      if (data.success) {
        await checkStatus();
      } else {
        setError(data.message || 'Installation failed. Please follow manual instructions.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartService = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/ollama/start-service`, {
        method: 'POST',
      });
      const data = await res.json();

      if (data.success) {
        setTimeout(() => checkStatus(), 2000); // Wait for service to start
      } else {
        setError(data.message || 'Failed to start service');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadModel = async (modelName: string) => {
    setDownloadingModel(modelName);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/ollama/download-model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_name: modelName }),
      });
      const data = await res.json();

      if (data.success) {
        await checkStatus();
        setCurrentStep('configure');
      } else {
        setError(data.message || 'Download failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDownloadingModel(null);
    }
  };

  const handleConfigure = async () => {
    if (!status) return;

    setLoading(true);
    try {
      // Update settings with Ollama configuration
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ai_provider: 'local',
          ollama_base_url: status.connection_url,
          ollama_model: status.models[0]?.name || '',
        }),
      });

      if (!res.ok) throw new Error('Failed to save settings');

      setCurrentStep('complete');
      setTimeout(() => onComplete(), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderCheckStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Checking Ollama Installation
        </CardTitle>
        <CardDescription>
          Analyzing your system to detect Ollama
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        )}

        {status && !loading && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Installed:</span>
              {status.installed ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Yes {status.version && `(${status.version})`}
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  No
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Running:</span>
              {status.running ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Yes
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  No
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Models:</span>
              <Badge variant={status.models_count > 0 ? 'default' : 'secondary'}>
                {status.models_count} installed
              </Badge>
            </div>

            {status.issues.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc pl-4 space-y-1">
                    {status.issues.map((issue, i) => (
                      <li key={i} className="text-sm">{issue}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {status.recommendations.length > 0 && (
              <Alert>
                <AlertDescription>
                  <div className="text-sm font-semibold mb-2">Recommendations:</div>
                  <ul className="list-disc pl-4 space-y-1">
                    {status.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm">{rec}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={checkStatus} disabled={loading} className="w-full">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Re-check Status
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderInstallStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          {status?.installed ? 'Start Ollama Service' : 'Install Ollama'}
        </CardTitle>
        <CardDescription>
          {status?.installed
            ? 'Ollama is installed but not running'
            : 'Set up Ollama on your system'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {status?.installed && !status.running && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ollama is installed but the service isn't running. Start it now:
            </p>
            <Button onClick={handleStartService} disabled={loading} className="w-full">
              <PlayCircle className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Start Ollama Service
            </Button>
          </div>
        )}

        {!status?.installed && installScript && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-2">System Detected:</h4>
              <p className="text-sm text-muted-foreground">
                {installScript.system.os} ({installScript.system.machine})
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Installation Steps:</h4>
              <ol className="list-decimal pl-5 space-y-2 text-sm">
                {installScript.instructions.map((instruction, i) => (
                  <li key={i}>{instruction}</li>
                ))}
              </ol>
            </div>

            {installScript.system.os === 'Linux' && (
              <Button onClick={handleInstall} disabled={loading} className="w-full">
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Terminal className="h-4 w-4 mr-2" />
                )}
                Auto-Install on Linux
              </Button>
            )}

            <div className="bg-muted p-3 rounded-md">
              <p className="text-xs font-mono whitespace-pre-wrap">{installScript.script}</p>
            </div>

            <Button variant="outline" onClick={checkStatus} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              I've Installed It - Check Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderModelsStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Download a Model
        </CardTitle>
        <CardDescription>
          Choose a model to download (this may take a few minutes)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3">
          {recommendedModels.map((model) => (
            <Card key={model.name} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold">{model.name}</h4>
                  <p className="text-xs text-muted-foreground">{model.description}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">{model.size}</Badge>
                    <Badge variant="outline" className="text-xs">{model.use_case}</Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleDownloadModel(model.name)}
                  disabled={downloadingModel !== null}
                >
                  {downloadingModel === model.name ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <Alert>
          <AlertDescription className="text-xs">
            💡 Tip: You can also download models manually using: <code className="bg-muted px-1 rounded">ollama pull model-name</code>
          </AlertDescription>
        </Alert>

        <Button variant="outline" onClick={checkStatus} className="w-full">
          <RefreshCw className="h-4 w-4 mr-2" />
          I've Downloaded a Model - Continue
        </Button>
      </CardContent>
    </Card>
  );

  const renderConfigureStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          Ready to Configure
        </CardTitle>
        <CardDescription>
          Everything is set up! Configure the app to use Ollama
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status && (
          <div className="space-y-3">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">✅ Ollama is ready!</p>
                  <ul className="text-sm space-y-1 ml-4 list-disc">
                    <li>Version: {status.version}</li>
                    <li>Models available: {status.models_count}</li>
                    <li>Connection: {status.connection_url}</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            <div className="bg-muted p-3 rounded-md">
              <h4 className="text-sm font-semibold mb-2">Available Models:</h4>
              <ul className="space-y-1">
                {status.models.map((model) => (
                  <li key={model.name} className="text-sm flex items-center gap-2">
                    <Badge variant="secondary">{model.name}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <Button onClick={handleConfigure} disabled={loading} className="w-full">
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-2" />
          )}
          Configure & Complete Setup
        </Button>
      </CardContent>
    </Card>
  );

  const renderCompleteStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          Setup Complete!
        </CardTitle>
        <CardDescription>
          Ollama is now configured and ready to use
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-2">🎉 All set!</p>
            <p className="text-sm">
              You can now use local AI models with Ollama. Try the quick chat on the homepage!
            </p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Setup Progress</span>
          <span className="text-muted-foreground">
            {currentStep === 'check' && '1/4'}
            {currentStep === 'install' && '2/4'}
            {currentStep === 'models' && '3/4'}
            {(currentStep === 'configure' || currentStep === 'complete') && '4/4'}
          </span>
        </div>
        <Progress
          value={
            currentStep === 'check' ? 25 :
            currentStep === 'install' ? 50 :
            currentStep === 'models' ? 75 : 100
          }
        />
      </div>

      {/* Step content */}
      {currentStep === 'check' && renderCheckStep()}
      {currentStep === 'install' && renderInstallStep()}
      {currentStep === 'models' && renderModelsStep()}
      {currentStep === 'configure' && renderConfigureStep()}
      {currentStep === 'complete' && renderCompleteStep()}
    </div>
  );
}
