import './FileTabs.css';

export interface FileTab {
  id: number;
  name: string;
  snapshot: string; // Serialized project JSON
}

interface FileTabsProps {
  tabs: FileTab[];
  activeTabId: number;
  onSelectTab: (id: number) => void;
  onCloseTab: (id: number) => void;
  onNewTab: () => void;
}

export function FileTabs({ tabs, activeTabId, onSelectTab, onCloseTab, onNewTab }: FileTabsProps) {
  return (
    <div className="file-tabs-bar">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`file-tab ${tab.id === activeTabId ? 'active' : ''}`}
          onClick={() => onSelectTab(tab.id)}
        >
          <span className="file-tab-name">{tab.name || 'Untitled'}</span>
          {tabs.length > 1 && (
            <span
              className="file-tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
            >
              ×
            </span>
          )}
        </button>
      ))}
      <button className="file-tab-add" onClick={onNewTab} title="New Project Tab">
        +
      </button>
    </div>
  );
}
