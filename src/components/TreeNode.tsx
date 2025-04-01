
import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { TreeNode as TreeNodeType } from '@/types/pivot';
import { cn } from '@/lib/utils';

interface TreeNodeProps {
  node: TreeNodeType;
  onToggle: (nodeId: string) => void;
  onSelect: (nodeId: string) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, onToggle, onSelect }) => {
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(node.id);
  };

  const handleSelect = () => {
    onSelect(node.id);
  };

  return (
    <div className="select-none">
      <div 
        className={cn(
          "flex items-center px-2 py-1 hover:bg-gray-100 cursor-pointer",
          node.selected && "bg-blue-50"
        )}
        onClick={handleSelect}
      >
        <div style={{ paddingLeft: `${node.level * 16}px` }} className="flex items-center">
          {node.children && node.children.length > 0 ? (
            <div onClick={handleToggle} className="mr-1 p-1 hover:bg-gray-200 rounded">
              {node.expanded ? 
                <ChevronDown className="h-4 w-4 text-gray-500" /> : 
                <ChevronRight className="h-4 w-4 text-gray-500" />
              }
            </div>
          ) : (
            <div className="w-6"></div>
          )}
          <span>{node.label}</span>
        </div>
      </div>
      
      {node.expanded && node.children && (
        <div>
          {node.children.map(childNode => (
            <TreeNode 
              key={childNode.id} 
              node={childNode} 
              onToggle={onToggle} 
              onSelect={onSelect} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TreeNode;
