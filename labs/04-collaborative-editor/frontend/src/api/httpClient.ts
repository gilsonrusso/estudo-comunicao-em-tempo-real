import axios from 'axios';
import { API_BASE } from '../constants/api.constants';

export const httpClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function getErrorMessage(
  error: unknown,
  fallbackMessage = 'Ocorreu um erro inesperado'
): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      { error?: string; details?: string; message?: string } | undefined;
    if (data?.details) return data.details;
    if (data?.error) return data.error;
    if (data?.message) return data.message;
    if (typeof data === 'string') return data;
    if (error.message) return error.message;
  } else if (error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
}
