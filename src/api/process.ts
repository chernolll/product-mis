import { api, ApiResponse } from './axios';

export interface ProcessRecord {
  processDetailId: number;
  catalogId: number;
  imageUrl: string;
  newImageUrl: string;
  titles: string[];
  descriptions: string[];
  tags: string[];
  crateTime: number;
  sortFiled: number;
}

export const getUploadUrl = async () => {
  const response = await api.get<ApiResponse<{ imageName: string; targetUrl: string }>>('/process/manage/image/upload/url?endSuffix=jpg');
  return response.data;
};

export const uploadToOSS = async (url: string, file: File) => {
  await fetch(url, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });
};

export const queryProcess = async (catalogId: number) => {
  const response = await api.get<ApiResponse<ProcessRecord[]>>(`/process/manage/process/record/query?catalogId=${catalogId}&_t=${Date.now()}`);
  return response.data;
};

export const addProcess = async (data: {
  imageName: string;
  newImageName: string;
  titles: string[];
  descriptions: string[];
  content?: string;
  tags: string[];
  catalogId: number;
  sortFiled: number;
}) => {
  const response = await api.post<ApiResponse>('/process/manage/process/record/add', data);
  return response.data;
};

export const updateProcess = async (data: {
  processDetailId: number;
  titles: string[];
  descriptions: string[];
  content?: string;
  tags: string[];
  imageName: string;
  newImageName: string;
  sortFiled: number;
}) => {
  const response = await api.post<ApiResponse>('/process/manage/process/record/update', data);
  return response.data;
};

export const deleteProcess = async (processDetailId: number) => {
  const response = await api.post<ApiResponse>(`/process/manage/process/record/delete?processDetailId=${processDetailId}`);
  return response.data;
};
