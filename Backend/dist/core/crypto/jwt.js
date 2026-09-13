import jwt from "jsonwebtoken";
import { returnError, returnSuccess, tryCatchErrorToString } from "../flow/result.js";
const DEFAULT_JWT_SECRET = "diary-system-backend-secret-key-2026";
export function signJwtToken(payload, secret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET, expiresIn = process.env.JWT_EXPIRES_IN || "7d") {
    try {
        const token = jwt.sign(payload, secret, { expiresIn: expiresIn });
        return returnSuccess(token);
    }
    catch (error) {
        return returnError(`Sign JWT token failed: ${tryCatchErrorToString(error)}`);
    }
}
export function verifyJwtToken(token, secret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET) {
    try {
        const decoded = jwt.verify(token, secret);
        return returnSuccess(decoded);
    }
    catch (error) {
        return returnError(`Verify JWT token failed: ${tryCatchErrorToString(error)}`);
    }
}
//# sourceMappingURL=jwt.js.map