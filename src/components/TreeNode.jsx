
import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const TreeNode = ({ node, onToggle, onSelect }) => {
  const handleToggle = (e) => {
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
          node.selected && "bg-blue-50",
          node.level === 0 && "font-semibold"
        )}
        onClick={handleSelect}
      >
        <div style={{ paddingLeft: `${node.level * 20}px` }} className="flex items-center w-full">
          {node.children !== undefined ? (
            <div 
              onClick={handleToggle} 
              className="mr-1 p-1 hover:bg-gray-200 rounded"
            >
              {node.expanded ? 
                <ChevronDown className="h-4 w-4 text-gray-500" /> : 
                <ChevronRight className="h-4 w-4 text-gray-500" />
              }
            </div>
          ) : (
            <div className="w-6"></div>
          )}
          
          <div className="flex items-center gap-2 w-full">
            <span className={cn(
              "truncate",
              node.isLeaf && "italic text-gray-600",
              node.selected && "text-blue-700"
            )}>
              {node.label}
            </span>
            
            {node.column && (
              <span className="text-xs text-gray-400 ml-auto">
                {node.column}
              </span>
            )}
          </div>
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
