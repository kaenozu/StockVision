import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getEnhancedPrediction = (symbol: string) => {
  return apiClient.get(`/ml/enhanced-predict/${symbol}`);
};

export const getScenarios = (stockCode: string, predictionDays: number) => {
  return apiClient.get(`/ml/scenarios/${stockCode}?prediction_days=${predictionDays}`);
};

export const getRecommendedStockDetail = (symbol: string) => {
  return apiClient.get(`/recommended-stocks/${symbol}/detail`);
};

export const getMLModels = () => {
  return apiClient.get('/ml/models');
};

export const trainMLModels = (payload: any) => {
  return apiClient.post('/ml/train', payload);
};

export const getMLModelStatus = (modelId: string) => {
  return apiClient.get(`/ml/models/${modelId}`);
};
