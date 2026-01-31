import { useState } from 'react';
import { useWorkspaceStore } from '@/lib/workspace/state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, FileCode, Play } from 'lucide-react';

export function PlannerPane() {
  const { plan, toggleTask, updateTask, addTask, removeTask, setCurrentStep } = useWorkspaceStore();
  const [newTaskText, setNewTaskText] = useState('');
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleAddTask = () => {
    if (newTaskText.trim()) {
      addTask(newTaskText.trim(), []);
      setNewTaskText('');
    }
  };

  const startEdit = (id: string, text: string) => {
    setIsEditing(id);
    setEditText(text);
  };

  const finishEdit = () => {
    if (isEditing && editText.trim()) {
      updateTask(isEditing, editText.trim());
    }
    setIsEditing(null);
    setEditText('');
  };

  const handleImplement = () => {
    setCurrentStep('implement');
  };

  const completedCount = plan.filter(t => t.completed).length;

  return (
    <div className="pane-container">
      <div className="pane-header">
        <h2 className="pane-title">Implementation Plan</h2>
        <Badge variant="outline" className="text-xs">
          {completedCount}/{plan.length}
        </Badge>
      </div>

      <div className="pane-body">
        <div className="plan-add-section">
          <div className="flex gap-2">
            <Input
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              placeholder="Add a task..."
              className="flex-1"
            />
            <Button onClick={handleAddTask} size="icon" variant="outline">
              <Plus size={16} />
            </Button>
          </div>
        </div>

        <div className="plan-task-list">
          {plan.length === 0 ? (
            <div className="plan-empty">
              <p className="text-muted-foreground text-sm">
                Generate a plan to see implementation tasks
              </p>
            </div>
          ) : (
            plan.map((task) => (
              <div key={task.id} className="plan-task">
                <div className="plan-task-main">
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => toggleTask(task.id)}
                    className="plan-checkbox"
                  />
                  
                  {isEditing === task.id ? (
                    <Input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={finishEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') finishEdit();
                        if (e.key === 'Escape') setIsEditing(null);
                      }}
                      className="flex-1"
                      autoFocus
                    />
                  ) : (
                    <span
                      onClick={() => startEdit(task.id, task.text)}
                      className={`plan-task-text ${task.completed ? 'completed' : ''}`}
                    >
                      {task.text}
                    </span>
                  )}
                  
                  <button
                    onClick={() => removeTask(task.id)}
                    className="plan-task-remove"
                  >
                    <X size={14} />
                  </button>
                </div>

                {task.files.length > 0 && (
                  <div className="plan-task-files">
                    {task.files.map((file) => (
                      <Badge key={file} variant="secondary" className="text-xs">
                        <FileCode size={12} />
                        {file}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {plan.length > 0 && (
          <Button
            onClick={handleImplement}
            className="w-full implement-button"
          >
            <Play size={16} />
            Start Implementation
          </Button>
        )}
      </div>
    </div>
  );
}
