import { useState } from 'react';
import { useWorkspaceStore } from '@/lib/workspace/state';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileText, Link as LinkIcon, StickyNote, X, Sparkles } from 'lucide-react';

export function SpecPane() {
  const { specification, setSpecification, context, addContext, removeContext, setCurrentStep, setIsGenerating } = useWorkspaceStore();
  const [showContextMenu, setShowContextMenu] = useState(false);

  const handleGeneratePlan = async () => {
    if (!specification.trim()) return;
    
    setIsGenerating(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsGenerating(false);
    setCurrentStep('plan');
  };

  const addContextItem = (type: 'file' | 'url' | 'note') => {
    const id = crypto.randomUUID();
    const item = {
      id,
      type,
      label: type === 'file' ? 'example.ts' : type === 'url' ? 'https://...' : 'Note',
      content: '',
    };
    addContext(item);
    setShowContextMenu(false);
  };

  return (
    <div className="pane-container">
      <div className="pane-header">
        <h2 className="pane-title">Specification</h2>
        <Badge variant="outline" className="text-xs">
          Context: {context.length}
        </Badge>
      </div>

      <div className="pane-body">
        <div className="spec-input-group">
          <label className="spec-label">What do you want to build?</label>
          <Textarea
            value={specification}
            onChange={(e) => setSpecification(e.target.value)}
            placeholder="Describe your feature or issue in detail..."
            className="spec-textarea"
            rows={12}
          />
        </div>

        <div className="context-section">
          <div className="context-header">
            <span className="text-sm font-medium">Context</span>
            <div className="relative">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowContextMenu(!showContextMenu)}
              >
                + Add
              </Button>
              {showContextMenu && (
                <div className="context-menu">
                  <button onClick={() => addContextItem('file')} className="context-menu-item">
                    <FileText size={16} />
                    File
                  </button>
                  <button onClick={() => addContextItem('url')} className="context-menu-item">
                    <LinkIcon size={16} />
                    URL
                  </button>
                  <button onClick={() => addContextItem('note')} className="context-menu-item">
                    <StickyNote size={16} />
                    Note
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="context-list">
            {context.map((item) => (
              <div key={item.id} className="context-badge">
                {item.type === 'file' && <FileText size={14} />}
                {item.type === 'url' && <LinkIcon size={14} />}
                {item.type === 'note' && <StickyNote size={14} />}
                <span className="truncate">{item.label}</span>
                <button
                  onClick={() => removeContext(item.id)}
                  className="context-remove"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={handleGeneratePlan}
          disabled={!specification.trim()}
          className="w-full generate-button"
        >
          <Sparkles size={16} />
          Generate Plan
        </Button>
      </div>
    </div>
  );
}
