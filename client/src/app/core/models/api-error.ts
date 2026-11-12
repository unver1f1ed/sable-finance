export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: string;
  errors?: Record<string, string[]>;
}

export function isApiError(value: unknown): value is ApiError {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<ApiError>;
  return typeof candidate.code === 'string' && typeof candidate.status === 'number';
}
