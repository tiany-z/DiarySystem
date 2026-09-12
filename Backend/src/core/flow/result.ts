export interface StandardResult<T = any> {
  status: 1 | 0;
  data?: T;
  content: string;
}

export type ApiResponse<T = any> = StandardResult<T>;

export function returnSuccess<T>(data: T, content: string = "success"): StandardResult<T> {
  return {
    status: 1,
    data,
    content,
  };
}

export function returnError<T = any>(content: string): StandardResult<T> {
  return {
    status: 0,
    content,
  };
}

export function tryCatchErrorToString(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return String(error);
}
