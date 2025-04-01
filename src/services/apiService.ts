
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000'; // Update this to match your Python API URL

interface FilterParams {
  column: string;
  conditions?: Record<string, string>;
}

export const fetchColumns = async (): Promise<string[]> => {
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

export const fetchUniqueValues = async (params: FilterParams): Promise<string[]> => {
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

