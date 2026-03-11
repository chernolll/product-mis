import { type ApiResponse, api } from './axios';

export interface CatalogItem {
  catalogId: number;
  parentId: number | null;
  level: number;
  catalogName: string;
  createTime: number;
  children: Array<Omit<CatalogItem, 'parentId'> & { parentId: number }>;
}

export const checkKey = async () => {
  const response = await api.post<ApiResponse<{ flag: number }>>('/catalog/manage/check/key');
  return response.data;
};

export const queryCatalog = async () => {
  const response = await api.get<ApiResponse<CatalogItem[]>>('/catalog/manage/catalog/query');
  return response.data;
};

export const addCatalog = async (data: { parentId: number | null; catalogName: string; level: number }) => {
  const response = await api.post<ApiResponse>('/catalog/manage/catalog/add', data);
  return response.data;
};

export const updateCatalog = async (data: { catalogId: number; catalogName: string }) => {
  const response = await api.post<ApiResponse>('/catalog/manage/catalog/update', data);
  return response.data;
};

export const deleteCatalog = async (catalogId: number) => {
  const response = await api.post<ApiResponse>(`/catalog/manage/catalog/delete?catalogId=${catalogId}`);
  return response.data;
};
