import { ReactNode } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import '../styles/primer.css';
import './styles.css';

interface WorkspaceLayoutProps {
  header: ReactNode;
  leftPane: ReactNode;
  centerPane: ReactNode;
  rightPane: ReactNode;
}

export function WorkspaceLayout({ header, leftPane, centerPane, rightPane }: WorkspaceLayoutProps) {
  return (
    <div className="primer-theme workspace-layout">
      <div className="workspace-header">
        {header}
      </div>
      <div className="workspace-content">
        <PanelGroup direction="horizontal" className="workspace-panels">
          <Panel defaultSize={28} minSize={20} maxSize={40} className="workspace-panel">
            <div className="workspace-panel-content">
              {leftPane}
            </div>
          </Panel>
          
          <PanelResizeHandle className="workspace-resize-handle" />
          
          <Panel defaultSize={36} minSize={25} maxSize={50} className="workspace-panel">
            <div className="workspace-panel-content">
              {centerPane}
            </div>
          </Panel>
          
          <PanelResizeHandle className="workspace-resize-handle" />
          
          <Panel defaultSize={36} minSize={25} maxSize={55} className="workspace-panel">
            <div className="workspace-panel-content">
              {rightPane}
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
