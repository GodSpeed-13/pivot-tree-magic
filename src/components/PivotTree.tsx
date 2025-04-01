
import React, { useEffect, useState } from 'react';
import { TreeNode as TreeNodeType, PivotColumn } from '@/types/pivot';
import TreeNode from './TreeNode';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { fetchColumns, fetchUniqueValues } from '@/services/apiService';
import { toast } from '@/components/ui/sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const PivotTree: React.FC = () => {
  const [columns, setColumns] = useState<PivotColumn[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [treeData, setTreeData] = useState<TreeNodeType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const loadColumns = async () => {
      try {
        setLoading(true);
        const columnsData = await fetchColumns();
        setColumns(columnsData.map(col => ({ name: col, selected: false })));
      } catch (error) {
        console.error('Failed to load columns:', error);
        toast.error('Failed to load columns');
      } finally {
        setLoading(false);
      }
    };

    loadColumns();
  }, []);

  const handleColumnToggle = (columnName: string) => {
    setColumns(prevColumns => 
      prevColumns.map(col => 
        col.name === columnName ? { ...col, selected: !col.selected } : col
      )
    );

    setSelectedColumns(prev => {
      if (prev.includes(columnName)) {
        return prev.filter(col => col !== columnName);
      } else {
        return [...prev, columnName];
      }
    });
  };

  const handleBuildTree = async () => {
    if (selectedColumns.length === 0) {
      toast.warning('Please select at least one column');
      return;
    }

    try {
      setLoading(true);
      let currentNodes: TreeNodeType[] = [];
      let conditions: Record<string, string> = {};

      for (let i = 0; i < selectedColumns.length; i++) {
        const column = selectedColumns[i];
        const values = await fetchUniqueValues({ 
          column, 
          conditions: i > 0 ? conditions : undefined 
        });

        if (i === 0) {
          // Root level
          currentNodes = values.map(value => ({
            id: `${column}-${value}`,
            label: value,
            level: 0,
            expanded: false,
            column,
            value,
            children: []
          }));
          setTreeData(currentNodes);
        } else {
          // Subsequent levels - we would need to recursively build the tree
          // This is simplified for now
        }
      }
    } catch (error) {
      console.error('Failed to build tree:', error);
      toast.error('Failed to build pivot tree');
    } finally {
      setLoading(false);
    }
  };

  const handleNodeToggle = (nodeId: string) => {
    const toggleNode = (nodes: TreeNodeType[]): TreeNodeType[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, expanded: !node.expanded };
        }
        if (node.children) {
          return {
            ...node,
            children: toggleNode(node.children)
          };
        }
        return node;
      });
    };

    setTreeData(toggleNode(treeData));
  };

  const handleNodeSelect = (nodeId: string) => {
    const selectNode = (nodes: TreeNodeType[]): TreeNodeType[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, selected: !node.selected };
        }
        if (node.children) {
          return {
            ...node,
            children: selectNode(node.children)
          };
        }
        return node;
      });
    };

    setTreeData(selectNode(treeData));
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full">
      {/* Column Selection Panel */}
      <Card className="w-full lg:w-1/3">
        <CardHeader>
          <CardTitle>Select Columns</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {columns.map(column => (
                <div key={column.name} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`column-${column.name}`}
                    checked={column.selected}
                    onCheckedChange={() => handleColumnToggle(column.name)}
                  />
                  <label 
                    htmlFor={`column-${column.name}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {column.name}
                  </label>
                </div>
              ))}
            </div>
          </ScrollArea>
          <Separator className="my-4" />
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Selected Columns:</h3>
            {selectedColumns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No columns selected</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedColumns.map((col, index) => (
                  <div key={col} className="flex items-center bg-blue-100 px-2 py-1 rounded text-xs">
                    <span>{index + 1}. {col}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button 
            className="w-full mt-4" 
            onClick={handleBuildTree} 
            disabled={loading || selectedColumns.length === 0}
          >
            {loading ? 'Building...' : 'Build Pivot Tree'}
          </Button>
        </CardContent>
      </Card>

      {/* Tree View Panel */}
      <Card className="w-full lg:w-2/3">
        <CardHeader>
          <CardTitle>Pivot Tree</CardTitle>
        </CardHeader>
        <CardContent>
          {treeData.length > 0 ? (
            <ScrollArea className="h-[400px] border rounded-md">
              {treeData.map(node => (
                <TreeNode 
                  key={node.id}
                  node={node}
                  onToggle={handleNodeToggle}
                  onSelect={handleNodeSelect}
                />
              ))}
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center h-[400px] border rounded-md bg-gray-50">
              <p className="text-gray-500">
                {loading 
                  ? 'Building pivot tree...' 
                  : 'Select columns and click "Build Pivot Tree" to generate the tree'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PivotTree;
