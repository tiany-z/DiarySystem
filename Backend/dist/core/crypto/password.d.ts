import { StandardResult } from "../flow/result.js";
export declare function hashPassword(password: string, rounds?: number): Promise<StandardResult<string>>;
export declare function verifyPassword(password: string, hash: string): Promise<StandardResult<boolean>>;
//# sourceMappingURL=password.d.ts.map