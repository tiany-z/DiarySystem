import jwt from "jsonwebtoken";
import { returnError, returnSuccess, StandardResult, tryCatchErrorToString } from "../flow/result.js";

export interface UserTokenPayload {
  userId: string;
  username: string;
  role?: string;
  userTier?: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

const DEFAULT_JWT_SECRET = "diary-system-backend-secret-key-2026";

export function signJwtToken(
  payload: UserTokenPayload,
  secret: string = process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
  expiresIn: string = process.env.JWT_EXPIRES_IN || "7d"
): StandardResult<string> {
  try {
    const token = jwt.sign(payload, secret, { expiresIn: expiresIn as any });
    return returnSuccess(token);
  } catch (error) {
    return returnError(`Sign JWT token failed: ${tryCatchErrorToString(error)}`);
  }
}

export function verifyJwtToken(
  token: string,
  secret: string = process.env.JWT_SECRET || DEFAULT_JWT_SECRET
): StandardResult<UserTokenPayload> {
  try {
    const decoded = jwt.verify(token, secret) as UserTokenPayload;
    return returnSuccess(decoded);
  } catch (error) {
    return returnError(`Verify JWT token failed: ${tryCatchErrorToString(error)}`);
  }
}
