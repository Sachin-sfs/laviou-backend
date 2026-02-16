export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function ok<T>(data: T, message = 'OK'): ApiResponse<T> {
  return { data, message, success: true };
}

export function paginate<T>(opts: {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}): PaginatedResponse<T> {
  const totalPages = Math.max(1, Math.ceil(opts.total / opts.pageSize));
  return {
    data: opts.data,
    total: opts.total,
    page: opts.page,
    pageSize: opts.pageSize,
    totalPages,
  };
}
