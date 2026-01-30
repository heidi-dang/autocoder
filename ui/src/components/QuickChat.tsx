import { useState, useEffect, useRef } from "react";
import {
  Send,
  Loader2,
  MessageSquare,
  X,
  Zap,
  Code2,
  Brain,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: {
    taskId?: string;
    command?: string;
    mode?: string;
  };
}

interface QuickChatProps {
  onClose?: () => void;
}

export function QuickChat({ onClose }: QuickChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [aiMode, setAiMode] = useState<"assistant" | "agent" | "spec">(
    "assistant"
  );
  const [selectedModel, setSelectedModel] = useState("auto");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch available models on mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch("/api/settings/ollama-models");
        const data = await response.json();
        if (data.models && Array.isArray(data.models)) {
          setAvailableModels(data.models.map((m: { name: string }) => m.name));
        }
      } catch (error) {
        console.error("Failed to fetch models:", error);
      }
    };
    fetchModels();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Parse commands from input (e.g., /task, /debug, /analyze)
  const parseCommand = (text: string): { command?: string; content: string } => {
    const commandMatch = text.match(/^\/(\w+)\s*(.*)/);
    if (commandMatch) {
      return {
        command: commandMatch[1],
        content: commandMatch[2] || "",
      };
    }
    return { content: text };
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "agent":
        return <Zap size={16} />;
      case "spec":
        return <Code2 size={16} />;
      default:
        return <Brain size={16} />;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const parsedInput = parseCommand(input.trim());
    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      metadata: {
        command: parsedInput.command,
        mode: aiMode,
      },
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Show task/command confirmation if using a command
    if (parsedInput.command) {
      const systemMsg: Message = {
        role: "system",
        content: `⚡ Command: /${parsedInput.command} | Mode: ${aiMode}${
          selectedModel !== "auto" ? ` | Model: ${selectedModel}` : ""
        }`,
        metadata: { command: parsedInput.command, mode: aiMode },
      };
      setMessages((prev) => [...prev, systemMsg]);
    }

    try {
      const response = await fetch("/api/assistant/quick-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: parsedInput.content || input.trim(),
          mode: aiMode,
          model: selectedModel !== "auto" ? selectedModel : undefined,
          command: parsedInput.command,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "",
          metadata: { mode: aiMode },
        },
      ]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          assistantMessage += chunk;

          setMessages((prev) => {
            const updated = [...prev];
            if (updated[updated.length - 1]) {
              updated[updated.length - 1] = {
                role: "assistant",
                content: assistantMessage,
                metadata: { mode: aiMode },
              };
            }
            return updated;
          });
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `❌ Error: ${
            error instanceof Error ? error.message : "Unknown error occurred"
          }`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg border-0 rounded-lg overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-lg">
            <MessageSquare size={20} />
          </div>
          <div>
            <CardTitle className="text-lg">AI Control Center</CardTitle>
            <p className="text-xs text-slate-300 mt-1">
              Chat with AI, control mode, choose model, create tasks
            </p>
          </div>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-white hover:bg-white/20"
          >
            <X size={16} />
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4 p-4">
        {/* Control Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
          {/* AI Mode Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
              AI Mode
            </label>
            <Select value={aiMode} onValueChange={(value: any) => setAiMode(value)}>
              <SelectTrigger className="h-9 text-sm">
                <div className="flex items-center gap-2">
                  {getModeIcon(aiMode)}
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assistant">
                  <div className="flex items-center gap-2">
                    <Brain size={14} />
                    Assistant
                  </div>
                </SelectItem>
                <SelectItem value="agent">
                  <div className="flex items-center gap-2">
                    <Zap size={14} />
                    Agent
                  </div>
                </SelectItem>
                <SelectItem value="spec">
                  <div className="flex items-center gap-2">
                    <Code2 size={14} />
                    Spec Creator
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {aiMode === "agent"
                ? "Autonomous execution mode"
                : aiMode === "spec"
                ? "Generate specifications"
                : "Chat assistance"}
            </p>
          </div>

          {/* Model Selection */}
          {availableModels.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                Model
              </label>
              <Select
                value={selectedModel}
                onValueChange={setSelectedModel}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (Best)</SelectItem>
                  {availableModels.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model.replace(":", " • ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectedModel === "auto"
                  ? "Auto-select best model"
                  : selectedModel}
              </p>
            </div>
          )}

          {/* Info/Settings */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
              Quick Tips
            </label>
            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <p>• Use <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">/task</code> to create tasks</p>
              <p>• Use <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">/debug</code> for debugging</p>
              <p>• Or just chat freely</p>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <ScrollArea
          ref={scrollRef}
          className="h-[400px] pr-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
        >
          <div className="p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400 py-12">
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                  <MessageSquare size={32} className="opacity-50" />
                </div>
                <p className="text-sm font-medium">Welcome to AI Control Center</p>
                <p className="text-xs mt-2 max-w-xs">
                  Select your AI mode, choose a model, and start chatting. Use commands
                  like /task to create tasks directly.
                </p>
                <div className="mt-4 space-y-2 text-left text-xs">
                  <p className="font-semibold">Available commands:</p>
                  <div className="space-y-1">
                    <p>
                      <Badge className="mr-2">/task</Badge> Create AI task
                    </p>
                    <p>
                      <Badge className="mr-2">/debug</Badge> Debug code
                    </p>
                    <p>
                      <Badge className="mr-2">/analyze</Badge> Analyze code
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "system" ? (
                    <div className="w-full">
                      <Badge variant="outline" className="text-xs">
                        {message.content}
                      </Badge>
                    </div>
                  ) : (
                    <div
                      className={`max-w-[75%] rounded-lg px-4 py-3 ${
                        message.role === "user"
                          ? "bg-blue-500 text-white rounded-br-none shadow-md"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-none shadow-sm border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                      {message.metadata?.command && message.role === "user" && (
                        <p className="text-xs opacity-70 mt-2">
                          via /{message.metadata.command}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg px-4 py-3 flex items-center gap-2 rounded-bl-none">
                  <Loader2 size={16} className="animate-spin text-slate-600 dark:text-slate-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {aiMode === "agent"
                      ? "Agent is working..."
                      : aiMode === "spec"
                      ? "Creating specification..."
                      : "Thinking..."}
                  </span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                Message
              </label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message or use /task, /debug, /analyze..."
                className="resize-none text-sm"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              size="lg"
              className="shrink-0 h-auto px-6 rounded-lg bg-blue-500 hover:bg-blue-600"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Shift + Enter for new line • Enter to send
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
