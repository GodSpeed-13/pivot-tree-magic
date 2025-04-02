
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000'; // Update this to match your Python API URL

export const fetchColumns = async () => {
  try {
    console.log('Fetching columns from:', `${API_BASE_URL}/columns`);
    const response = await axios.get(`${API_BASE_URL}/columns`);
    console.log('Columns API response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching columns:', error);
    throw error;
  }
};

export const fetchUniqueValues = async (params) => {
  try {
    console.log('Fetching unique values with params:', params);
    const response = await axios.post(`${API_BASE_URL}/unique_values`, params);
    console.log('Unique values API response:', response.data);
    return response.data.unique_values;
  } catch (error) {
    console.error('Error fetching unique values:', error);
    throw error;
  }
};

// Enhanced sample data for deeper tree nesting
export const getSampleData = () => {
  const SAMPLE_COLUMNS = [
    "report_name", 
    "category", 
    "project", 
    "sub_project",
    "task",
    "created_by", 
    "updated_date"
  ];
  
  const SAMPLE_VALUES = {
    report_name: ['Sales Report', 'Marketing Dashboard', 'Financial Summary', 'Operations Overview', 'Customer Analytics'],
    category: ['Analytics', 'Operations', 'Finance', 'Marketing', 'HR', 'IT'],
    project: ['Project A', 'Project B', 'Project C', 'Project D', 'Project E'],
    sub_project: ['Planning', 'Design', 'Development', 'Testing', 'Deployment', 'Maintenance'],
    task: ['Research', 'Documentation', 'Implementation', 'Review', 'Feedback', 'Revision'],
    created_by: ['John Smith', 'Jane Doe', 'Alex Johnson', 'Maria Garcia', 'Robert Chen'],
    updated_date: ['2023-01-15', '2023-02-20', '2023-03-25', '2023-04-10', '2023-05-05']
  };
  
  return { SAMPLE_COLUMNS, SAMPLE_VALUES };
};

// Function to generate conditional sample data for child nodes
export const getConditionalSampleData = (parentColumn, parentValue, childColumn) => {
  const { SAMPLE_VALUES } = getSampleData();
  
  // Get the base sample values for the child column
  const baseValues = SAMPLE_VALUES[childColumn] || ['Sample 1', 'Sample 2', 'Sample 3'];
  
  // For certain parent-child relationships, return specific subsets
  if (parentColumn === "project" && parentValue === "Project A") {
    if (childColumn === "sub_project") {
      return ['Planning', 'Design', 'Development']; 
    }
  } 
  else if (parentColumn === "project" && parentValue === "Project B") {
    if (childColumn === "sub_project") {
      return ['Testing', 'Deployment'];
    }
  }
  else if (parentColumn === "sub_project" && parentValue === "Development") {
    if (childColumn === "task") {
      return ['Implementation', 'Documentation', 'Review'];
    }
  }
  else if (parentColumn === "sub_project" && parentValue === "Testing") {
    if (childColumn === "task") {
      return ['Unit Tests', 'Integration Tests', 'Performance Tests'];
    }
  }
  
  // Default: return a subset based on the parent value's index
  const parentIndex = Math.abs(parentValue.charCodeAt(0)) % baseValues.length;
  const startIndex = parentIndex % baseValues.length;
  const endIndex = (startIndex + 3) % baseValues.length;
  
  if (startIndex < endIndex) {
    return baseValues.slice(startIndex, endIndex);
  } else {
    return [...baseValues.slice(startIndex), ...baseValues.slice(0, endIndex)];
  }
};
