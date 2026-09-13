export interface StandardResult<T = any> {
    status: 1 | 0;
    data?: T;
    content: string;
}
export type ApiResponse<T = any> = StandardResult<T>;
export declare function returnSuccess<T>(data: T, content?: string): StandardResult<T>;
export declare function returnError<T = any>(content: string): StandardResult<T>;
export declare function tryCatchErrorToString(error: unknown): string;
//# sourceMappingURL=result.d.ts.map