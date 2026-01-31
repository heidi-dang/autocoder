import { useState, useEffect, useRef } from "react";
import {
  Send,
  Loader2,
  MessageSquare,
  X,
  Zap,
  Code2,
  Brain,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
        if (!response.ok) {
          console.warn(`Failed to fetch models: ${response.status}`);
          return;
        }

        const text = await response.text();
        if (!text) {
          console.warn("Empty response from models endpoint");
          return;
        }

        const data = JSON.parse(text);
        if (data.models && Array.isArray(data.models)) {
          setAvailableModels(data.models.map((m: { name: string }) => m.name));
        }
      } catch (error) {
        console.warn("Failed to fetch models:", error instanceof Error ? error.message : String(error));
        // Silently fail - models section won't be shown
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

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Server error (${response.status}): ${errorBody || response.statusText}`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body received");
      }

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
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `❌ Error: ${
            error instanceof Error ? error.message : "Unknown error occurred"
          }\n\nNote: The quick chat feature requires a backend API. Make sure the server is running.`,
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
            <CardTitle className="text-lg">Quick Chat</CardTitle>
            <p className="text-xs text-slate-300 mt-1">
              Chat with AI instantly - no project selection needed
            </p>
          </div>
        </div>
        
        {/* Mode and Model Selectors in Header */}
        <div className="flex items-center gap-2">
          {/* AI Mode Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-white hover:bg-white/20"
                title="AI Mode"
              >
                {aiMode === "agent" ? (
                  <Zap size={18} />
                ) : aiMode === "spec" ? (
                  <Code2 size={18} />
                ) : (
                  <Brain size={18} />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>AI Mode</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setAiMode("assistant")}
                className={aiMode === "assistant" ? "bg-blue-100 dark:bg-blue-900" : ""}
              >
                <Brain size={14} className="mr-2" />
                Assistant
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setAiMode("agent")}
                className={aiMode === "agent" ? "bg-blue-100 dark:bg-blue-900" : ""}
              >
                <Zap size={14} className="mr-2" />
                Agent
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setAiMode("spec")}
                className={aiMode === "spec" ? "bg-blue-100 dark:bg-blue-900" : ""}
              >
                <Code2 size={14} className="mr-2" />
                Spec Creator
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Model Dropdown */}
          {availableModels.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2 text-white hover:bg-white/20 text-xs"
                  title="Select Model"
                >
                  {selectedModel === "auto" ? "Auto" : selectedModel.split(":")[0]}
                  <ChevronDown size={14} className="ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Model</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setSelectedModel("auto")}
                  className={selectedModel === "auto" ? "bg-blue-100 dark:bg-blue-900" : ""}
                >
                  Auto (Best)
                </DropdownMenuItem>
                {availableModels.map((model) => (
                  <DropdownMenuItem
                    key={model}
                    onClick={() => setSelectedModel(model)}
                    className={selectedModel === model ? "bg-blue-100 dark:bg-blue-900" : ""}
                  >
                    {model.replace(":", " • ")}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

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
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4">
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
                <p className="text-sm font-medium">Start Chatting</p>
                <p className="text-xs mt-2 max-w-xs">
                  Ask me anything. Use /task for tasks, /debug for debugging, or just chat naturally.
                </p>
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

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
              }
            }}
            placeholder="Ask me anything... Use /task, /debug, or just chat freely"
            className="min-h-[80px] resize-none"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
            className="h-auto px-6 bg-blue-500 hover:bg-blue-600"
          >
            <Send size={18} />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
