import React, { useEffect, useState } from 'react';
import { TreeNode as TreeNodeType, PivotColumn } from '@/types/pivot';
import TreeNode from './TreeNode';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { fetchColumns, fetchUniqueValues, getSampleData, getConditionalSampleData } from '@/services/apiService';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const PivotTree: React.FC = () => {
  const { toast } = useToast();
  const [columns, setColumns] = useState<PivotColumn[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [treeData, setTreeData] = useState<TreeNodeType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { SAMPLE_COLUMNS, SAMPLE_VALUES } = getSampleData();

  useEffect(() => {
    // Load columns on component mount
    const loadColumns = async () => {
      try {
        setLoading(true);
        const columnsData = await fetchColumns();
        setColumns(columnsData.map(col => ({ name: col, selected: false })));
        console.log("API columns loaded:", columnsData);
      } catch (error) {
        console.error('Failed to load columns:', error);
        toast({
          title: "Error",
          description: "Failed to load columns. Using sample data instead.",
          variant: "destructive",
        });
        
        // Sample columns if API fails
        setColumns(SAMPLE_COLUMNS.map(col => ({ name: col, selected: false })));
        console.log("Using sample columns:", SAMPLE_COLUMNS);
      } finally {
        setLoading(false);
      }
    };

    loadColumns();
  }, [toast]);

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
      toast({
        title: "Warning",
        description: "Please select at least one column",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const rootColumn = selectedColumns[0];
      
      try {
        // Try to fetch values from API
        const values = await fetchUniqueValues({ column: rootColumn });
        
        // Create root level nodes
        const rootNodes = values.map(value => ({
          id: `${rootColumn}-${value}`,
          label: value,
          level: 0,
          expanded: false,
          column: rootColumn,
          value,
          children: [],
          isLeaf: selectedColumns.length === 1
        }));
        
        console.log("API data loaded for tree:", rootNodes);
        setTreeData(rootNodes);
        
      } catch (apiError) {
        console.error('API error, using sample data:', apiError);
        
        // Use sample data for the root level
        const sampleValues = SAMPLE_VALUES[rootColumn as keyof typeof SAMPLE_VALUES] || 
          ['Value 1', 'Value 2', 'Value 3'];
        
        // Create root level nodes with sample data
        const sampleNodes = sampleValues.map(value => ({
          id: `${rootColumn}-${value}`,
          label: value,
          level: 0,
          expanded: false,
          column: rootColumn,
          value,
          children: selectedColumns.length > 1 ? [] : undefined,
          isLeaf: selectedColumns.length === 1
        }));
        
        console.log("Using sample data for tree:", sampleNodes);
        setTreeData(sampleNodes);
        
        // If we have more than one selected column, add sample children to the first node
        if (selectedColumns.length > 1) {
          const childColumn = selectedColumns[1];
          const childValues = SAMPLE_VALUES[childColumn as keyof typeof SAMPLE_VALUES] || 
            ['Child 1', 'Child 2', 'Child 3'];
          
          // Add children to the first root node for demonstration
          if (sampleNodes.length > 0) {
            sampleNodes[0].children = childValues.map(childValue => ({
              id: `${childColumn}-${childValue}`,
              label: childValue,
              level: 1,
              expanded: false,
              column: childColumn,
              value: childValue,
              children: selectedColumns.length > 2 ? [] : undefined,
              isLeaf: selectedColumns.length === 2
            }));
            
            // Automatically expand the first node to show children
            sampleNodes[0].expanded = true;
          }
          
          setTreeData([...sampleNodes]);
        }
      }
    } catch (error) {
      console.error('Failed to build tree:', error);
      toast({
        title: "Error",
        description: "Failed to build pivot tree",
        variant: "destructive",
      });
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

  const collectConditions = (node: TreeNodeType | null, tree: TreeNodeType[]): Record<string, string> => {
    if (!node) {
      return {};
    }

    const conditions: Record<string, string> = {};
    if (node.column && node.value) {
      conditions[node.column] = node.value;
    }

    const parent = findParentNode(tree, node.id);
    if (parent) {
      const parentConditions = collectConditions(parent, tree);
      return { ...parentConditions, ...conditions };
    }

    return conditions;
  };

  const findParentNode = (nodes: TreeNodeType[], nodeId: string): TreeNodeType | null => {
    for (const node of nodes) {
      if (node.children && node.children.some(child => child.id === nodeId)) {
        return node;
      }
      if (node.children) {
        const foundInChildren = findParentNode(node.children, nodeId);
        if (foundInChildren) {
          return foundInChildren;
        }
      }
    }
    return null;
  };

  const handleNodeExpand = async (nodeId: string, node: TreeNodeType) => {
    if (!node.children || node.children.length > 0 || !node.column) {
      return; // Skip if children are already loaded
    }
    
    const nodeIndex = selectedColumns.indexOf(node.column);
    if (nodeIndex >= selectedColumns.length - 1) {
      return; // No more columns to expand
    }
    
    const childColumn = selectedColumns[nodeIndex + 1];
    
    const conditions = collectConditions(node, treeData);
    console.log("Fetching with accumulated conditions:", conditions);
    
    try {
      const values = await fetchUniqueValues({ 
        column: childColumn,
        conditions
      });
      
      const childNodes = values.map(value => ({
        id: `${childColumn}-${value}-${nodeId}`,
        label: value,
        level: node.level + 1,
        expanded: false,
        column: childColumn,
        value,
        children: nodeIndex + 1 < selectedColumns.length - 1 ? [] : undefined,
        isLeaf: nodeIndex + 1 === selectedColumns.length - 1
      }));
      
      setTreeData(prevTree => updateTreeNodeChildren(prevTree, nodeId, childNodes));
      
    } catch (error) {
      console.error('Failed to load child values:', error);
      
      const sampleValues = getConditionalSampleData(node.column, node.value || '', childColumn);
        
      const sampleChildNodes = sampleValues.map(value => ({
        id: `${childColumn}-${value}-${nodeId}`,
        label: value,
        level: node.level + 1,
        expanded: false,
        column: childColumn,
        value,
        children: nodeIndex + 1 < selectedColumns.length - 1 ? [] : undefined,
        isLeaf: nodeIndex + 1 === selectedColumns.length - 1
      }));
      
      setTreeData(prevTree => updateTreeNodeChildren(prevTree, nodeId, sampleChildNodes));
    }
  };

  const updateTreeNodeChildren = (
    tree: TreeNodeType[], 
    nodeId: string, 
    children: TreeNodeType[]
  ): TreeNodeType[] => {
    return tree.map(node => {
      if (node.id === nodeId) {
        return { ...node, children };
      }
      if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: updateTreeNodeChildren(node.children, nodeId, children)
        };
      }
      return node;
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full">
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
              {columns.length === 0 && !loading && (
                <div className="text-sm text-gray-500">No columns available</div>
              )}
              {loading && (
                <div className="text-sm text-gray-500">Loading columns...</div>
              )}
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
                  onToggle={(id) => {
                    handleNodeToggle(id);
                    const toggledNode = findNodeById(treeData, id);
                    if (toggledNode && !toggledNode.expanded) {
                      handleNodeExpand(id, toggledNode);
                    }
                  }}
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

const findNodeById = (nodes: TreeNodeType[], nodeId: string): TreeNodeType | null => {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }
    if (node.children && node.children.length > 0) {
      const foundNode = findNodeById(node.children, nodeId);
      if (foundNode) {
        return foundNode;
      }
    }
  }
  return null;
};

export default PivotTree;
