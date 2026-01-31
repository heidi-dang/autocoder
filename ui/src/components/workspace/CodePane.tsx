import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { useWorkspaceStore } from '@/lib/workspace/state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileCode, Check, X, Eye, Code2 } from 'lucide-react';

export function CodePane() {
  const { fileChanges, selectedFile, setSelectedFile, showDiff, setShowDiff, acceptChange, discardChange } = useWorkspaceStore();
  const [editorContent, setEditorContent] = useState('');

  const currentFile = fileChanges.find(f => f.path === selectedFile);

  const handleAccept = () => {
    if (selectedFile) {
      acceptChange(selectedFile);
      // Move to next file if available
      const nextFile = fileChanges.find(f => f.path !== selectedFile);
      setSelectedFile(nextFile?.path || null);
    }
  };

  const handleDiscard = () => {
    if (selectedFile) {
      discardChange(selectedFile);
      // Move to next file if available
      const nextFile = fileChanges.find(f => f.path !== selectedFile);
      setSelectedFile(nextFile?.path || null);
    }
  };

  return (
    <div className="pane-container">
      <div className="pane-header">
        <h2 className="pane-title">Code Workspace</h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={showDiff ? 'default' : 'outline'}
            onClick={() => setShowDiff(!showDiff)}
          >
            {showDiff ? <Eye size={14} /> : <Code2 size={14} />}
            {showDiff ? 'Diff' : 'Editor'}
          </Button>
        </div>
      </div>

      <div className="pane-body">
        {/* File List */}
        <div className="code-file-list">
          {fileChanges.length === 0 ? (
            <div className="code-empty">
              <FileCode size={32} className="text-muted-foreground" />
              <p className="text-muted-foreground text-sm">
                No pending changes
              </p>
            </div>
          ) : (
            fileChanges.map((file) => (
              <button
                key={file.path}
                onClick={() => setSelectedFile(file.path)}
                className={`code-file-item ${selectedFile === file.path ? 'active' : ''}`}
              >
                <FileCode size={14} />
                <span className="flex-1 truncate text-left">{file.path}</span>
                <Badge
                  variant={
                    file.type === 'added' ? 'default' :
                    file.type === 'modified' ? 'secondary' :
                    'destructive'
                  }
                  className="text-xs"
                >
                  {file.type === 'added' ? 'A' : file.type === 'modified' ? 'M' : 'D'}
                </Badge>
              </button>
            ))
          )}
        </div>

        {/* Editor/Diff Area */}
        {currentFile && (
          <div className="code-editor-section">
            <div className="code-editor-header">
              <span className="text-sm font-medium">{currentFile.path}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleDiscard}>
                  <X size={14} />
                  Discard
                </Button>
                <Button size="sm" onClick={handleAccept}>
                  <Check size={14} />
                  Accept
                </Button>
              </div>
            </div>

            <div className="code-editor-wrapper">
              {showDiff ? (
                <div className="code-diff-view">
                  <div className="code-diff-section">
                    <div className="code-diff-label">Original</div>
                    <Editor
                      height="100%"
                      language="typescript"
                      value={currentFile.originalContent}
                      theme="vs-dark"
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 13,
                        lineNumbers: 'on',
                      }}
                    />
                  </div>
                  <div className="code-diff-section">
                    <div className="code-diff-label">Modified</div>
                    <Editor
                      height="100%"
                      language="typescript"
                      value={currentFile.newContent}
                      theme="vs-dark"
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 13,
                        lineNumbers: 'on',
                      }}
                    />
                  </div>
                </div>
              ) : (
                <Editor
                  height="100%"
                  language="typescript"
                  value={editorContent || currentFile.newContent}
                  onChange={(value) => setEditorContent(value || '')}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 13,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
