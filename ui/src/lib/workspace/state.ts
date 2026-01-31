import { create } from 'zustand';

export type WorkflowStep = 'brainstorm' | 'plan' | 'implement' | 'verify';

export interface ContextItem {
  id: string;
  label: string;
  type: 'file' | 'url' | 'note';
  content: string;
}

export interface PlanTask {
  id: string;
  text: string;
  completed: boolean;
  files: string[];
}

export interface FileChange {
  path: string;
  type: 'added' | 'modified' | 'deleted';
  originalContent: string;
  newContent: string;
}

export interface WorkspaceState {
  // Workflow
  currentStep: WorkflowStep;
  setCurrentStep: (step: WorkflowStep) => void;
  
  // Specification pane
  specification: string;
  setSpecification: (spec: string) => void;
  context: ContextItem[];
  addContext: (item: ContextItem) => void;
  removeContext: (id: string) => void;
  
  // Planner pane
  plan: PlanTask[];
  setPlan: (plan: PlanTask[]) => void;
  toggleTask: (id: string) => void;
  updateTask: (id: string, text: string) => void;
  addTask: (text: string, files: string[]) => void;
  removeTask: (id: string) => void;
  
  // Code pane
  selectedFile: string | null;
  setSelectedFile: (file: string | null) => void;
  fileChanges: FileChange[];
  setFileChanges: (changes: FileChange[]) => void;
  acceptChange: (path: string) => void;
  discardChange: (path: string) => void;
  
  // UI state
  showDiff: boolean;
  setShowDiff: (show: boolean) => void;
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  // Workflow
  currentStep: 'brainstorm',
  setCurrentStep: (step) => set({ currentStep: step }),
  
  // Specification pane
  specification: '',
  setSpecification: (spec) => set({ specification: spec }),
  context: [],
  addContext: (item) => set((state) => ({ context: [...state.context, item] })),
  removeContext: (id) => set((state) => ({ context: state.context.filter((c) => c.id !== id) })),
  
  // Planner pane
  plan: [],
  setPlan: (plan) => set({ plan }),
  toggleTask: (id) => set((state) => ({
    plan: state.plan.map((task) =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ),
  })),
  updateTask: (id, text) => set((state) => ({
    plan: state.plan.map((task) =>
      task.id === id ? { ...task, text } : task
    ),
  })),
  addTask: (text, files) => set((state) => ({
    plan: [...state.plan, { id: crypto.randomUUID(), text, completed: false, files }],
  })),
  removeTask: (id) => set((state) => ({
    plan: state.plan.filter((task) => task.id !== id),
  })),
  
  // Code pane
  selectedFile: null,
  setSelectedFile: (file) => set({ selectedFile: file }),
  fileChanges: [],
  setFileChanges: (changes) => set({ fileChanges: changes }),
  acceptChange: (path) => set((state) => ({
    fileChanges: state.fileChanges.filter((c) => c.path !== path),
  })),
  discardChange: (path) => set((state) => ({
    fileChanges: state.fileChanges.filter((c) => c.path !== path),
  })),
  
  // UI state
  showDiff: true,
  setShowDiff: (show) => set({ showDiff: show }),
  isGenerating: false,
  setIsGenerating: (generating) => set({ isGenerating: generating }),
}));
