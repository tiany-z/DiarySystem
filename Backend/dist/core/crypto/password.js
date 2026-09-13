import bcrypt from "bcryptjs";
import { returnError, returnSuccess, tryCatchErrorToString } from "../flow/result.js";
export async function hashPassword(password, rounds = 10) {
    try {
        const salt = await bcrypt.genSalt(rounds);
        const hash = await bcrypt.hash(password, salt);
        return returnSuccess(hash);
    }
    catch (error) {
        return returnError(`Hash password failed: ${tryCatchErrorToString(error)}`);
    }
}
export async function verifyPassword(password, hash) {
    try {
        const isMatch = await bcrypt.compare(password, hash);
        return returnSuccess(isMatch);
    }
    catch (error) {
        return returnError(`Verify password failed: ${tryCatchErrorToString(error)}`);
    }
}
//# sourceMappingURL=password.js.map