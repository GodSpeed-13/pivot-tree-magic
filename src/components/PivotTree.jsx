
import React, { useEffect, useState } from 'react';
import TreeNode from './TreeNode';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { X, Info, ChevronRight } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { fetchColumns, fetchUniqueValues, getSampleData, getConditionalSampleData } from '@/services/apiService';
import { useToast } from '@/hooks/use-toast';

const PivotTree = () => {
  const { toast } = useToast();
  const [treeData, setTreeData] = useState([]);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [loading, setLoading] = useState(false);

  // Function to load available columns
  const loadColumns = async () => {
    setLoading(true);
    try {
      // Try to fetch columns from API
      const columns = await fetchColumns();
      setAvailableColumns(columns.map(name => ({
        name,
        selected: false
      })));
    } catch (error) {
      console.error('Error loading columns:', error);
      
      // Fallback to sample data
      const { SAMPLE_COLUMNS } = getSampleData();
      setAvailableColumns(SAMPLE_COLUMNS.map(name => ({
        name,
        selected: false
      })));
      
      toast({
        title: "Using Sample Data",
        description: "Could not connect to API. Using sample data instead.",
        variant: "default",
      });
    } finally {
      setLoading(false);
    }
  };

  // Initial load of columns
  useEffect(() => {
    loadColumns();
  }, []);

  // Toggle column selection
  const handleColumnToggle = (column) => {
    setAvailableColumns(prevColumns => 
      prevColumns.map(col => 
        col.name === column.name 
          ? { ...col, selected: !col.selected }
          : col
      )
    );
  };

  // Apply selected columns and initialize tree
  const applyColumns = async () => {
    const columns = availableColumns
      .filter(col => col.selected)
      .map(col => col.name);

    if (columns.length === 0) {
      toast({
        title: "No columns selected",
        description: "Please select at least one column to create the pivot tree.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedColumns(columns);
    
    // Reset tree data when columns change
    setTreeData([]);
    
    if (columns.length > 0) {
      // Load root level data for the first column
      const rootColumn = columns[0];
      
      setLoading(true);
      try {
        // Try to get values from the API
        const values = await fetchUniqueValues({ column: rootColumn });
        
        // Create root nodes from values
        const rootNodes = values.map(value => ({
          id: `${rootColumn}-${value}`,
          label: value,
          level: 0,
          expanded: false,
          column: rootColumn,
          value: value,
          children: columns.length > 1 ? [] : undefined,
          isLeaf: columns.length === 1
        }));
        
        setTreeData(rootNodes);
        
      } catch (error) {
        console.error('Failed to fetch root values:', error);
        
        // Fallback to sample data
        const { SAMPLE_VALUES } = getSampleData();
        const sampleValues = SAMPLE_VALUES[rootColumn] || [];
        
        const rootNodes = sampleValues.map(value => ({
          id: `${rootColumn}-${value}`,
          label: value,
          level: 0,
          expanded: false,
          column: rootColumn,
          value: value,
          children: columns.length > 1 ? [] : undefined,
          isLeaf: columns.length === 1
        }));
        
        setTreeData(rootNodes);
        
        toast({
          title: "Using Sample Data",
          description: "Could not fetch data from API. Using sample data instead.",
          variant: "default",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle node expansion/collapse
  const toggleNode = (nodeId) => {
    const toggleExpanded = (nodes) => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          const expanded = !node.expanded;
          
          // Load children if expanding and children are empty
          if (expanded && node.children && node.children.length === 0) {
            handleNodeExpand(nodeId, node);
          }
          
          return { ...node, expanded };
        } else if (node.children) {
          return { ...node, children: toggleExpanded(node.children) };
        } else {
          return node;
        }
      });
    };

    setTreeData(toggleExpanded(treeData));
  };

  // Handle node selection
  const selectNode = (nodes, selectedId = null) => {
    return nodes.map(node => {
      if (node.children) {
        return {
          ...node,
          selected: node.id === selectedId,
          children: selectNode(node.children, selectedId)
        };
      }
      return {
        ...node,
        selected: node.id === selectedId
      };
    });
  };

  const handleSelectNode = (nodeId) => {
    setTreeData(selectNode(treeData, nodeId));
  };

  // Reset selection
  const resetSelection = () => {
    setTreeData(selectNode(treeData));
  };

  const collectConditions = (node, tree) => {
    if (!node) {
      return {};
    }

    const conditions = {};
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

  const findParentNode = (nodes, nodeId) => {
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

  const handleNodeExpand = async (nodeId, node) => {
    if (!node.children || node.children.length > 0 || !node.column) {
      return; // Skip if children are already loaded
    }
    
    // Find the index of the current column
    const nodeIndex = selectedColumns.findIndex(col => col === node.column);
    if (nodeIndex === -1 || nodeIndex >= selectedColumns.length - 1) {
      return; // No more child columns or column not found
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
        value: value,
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
        value: value,
        children: nodeIndex + 1 < selectedColumns.length - 1 ? [] : undefined,
        isLeaf: nodeIndex + 1 === selectedColumns.length - 1
      }));
      
      setTreeData(prevTree => updateTreeNodeChildren(prevTree, nodeId, sampleChildNodes));
    }
  };

  const updateTreeNodeChildren = (
    tree, 
    nodeId, 
    childNodes
  ) => {
    return tree.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          children: childNodes
        };
      } else if (node.children) {
        return {
          ...node,
          children: updateTreeNodeChildren(node.children, nodeId, childNodes)
        };
      } else {
        return node;
      }
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full">
      <Card className="w-full lg:w-1/3">
        <CardHeader>
          <CardTitle>Select Columns</CardTitle>
          <CardDescription>
            Choose the columns to create your pivot hierarchy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border rounded-md">
              <ScrollArea className="h-[300px] px-4 py-2">
                <div className="space-y-2">
                  {availableColumns.map(column => (
                    <div key={column.name} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`column-${column.name}`}
                        checked={column.selected}
                        onCheckedChange={() => handleColumnToggle(column)}
                      />
                      <Label 
                        htmlFor={`column-${column.name}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {column.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">
                Selected columns (order determines hierarchy):
              </Label>
              <div className="flex flex-wrap gap-2">
                {availableColumns
                  .filter(col => col.selected)
                  .map((column, index) => (
                    <Badge key={column.name} variant="secondary" className="flex items-center">
                      <span className="mr-1">{index + 1}.</span> {column.name}
                      <button 
                        className="ml-1 rounded-full hover:bg-muted p-0.5"
                        onClick={() => handleColumnToggle(column)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                {availableColumns.filter(col => col.selected).length === 0 && (
                  <span className="text-sm text-muted-foreground italic">No columns selected</span>
                )}
              </div>
            </div>
            
            <Button onClick={applyColumns} disabled={loading}>
              {loading ? "Loading..." : "Apply Columns"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full lg:w-2/3">
        <CardHeader>
          <CardTitle>Pivot Tree</CardTitle>
          <CardDescription>
            Explore your data in a hierarchical tree
          </CardDescription>
        </CardHeader>
        <CardContent>
          {treeData.length > 0 ? (
            <div className="border rounded-md">
              <ScrollArea className="h-[400px]">
                <div className="p-2">
                  {treeData.map(node => (
                    <TreeNode 
                      key={node.id}
                      node={node}
                      onToggle={toggleNode}
                      onSelect={handleSelectNode}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] border rounded-md bg-muted/20 space-y-3">
              <Info className="h-10 w-10 text-muted-foreground" />
              <div className="text-center space-y-1">
                <h3 className="font-medium">No Data to Display</h3>
                <p className="text-sm text-muted-foreground">
                  Select columns and apply them to generate the pivot tree
                </p>
              </div>
              {selectedColumns.length > 0 && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={applyColumns}
                >
                  Refresh Data
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Helper function to find a node by ID in the tree
const findNodeById = (nodes, nodeId) => {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }
    if (node.children) {
      const found = findNodeById(node.children, nodeId);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

export default PivotTree;
