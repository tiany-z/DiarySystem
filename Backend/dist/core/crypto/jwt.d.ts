import { StandardResult } from "../flow/result.js";
export interface UserTokenPayload {
    userId: string;
    username: string;
    role?: string;
    userTier?: string;
    iat?: number;
    exp?: number;
    [key: string]: any;
}
export declare function signJwtToken(payload: UserTokenPayload, secret?: string, expiresIn?: string): StandardResult<string>;
export declare function verifyJwtToken(token: string, secret?: string): StandardResult<UserTokenPayload>;
//# sourceMappingURL=jwt.d.ts.map