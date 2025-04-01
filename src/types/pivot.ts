
export interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
  level: number;
  expanded?: boolean;
  selected?: boolean;
  column?: string;
  value?: string;
  isLeaf?: boolean;
}

export interface PivotColumn {
  name: string;
  selected: boolean;
}
