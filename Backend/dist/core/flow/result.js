export function returnSuccess(data, content = "success") {
    return {
        status: 1,
        data,
        content,
    };
}
export function returnError(content) {
    return {
        status: 0,
        content,
    };
}
export function tryCatchErrorToString(error) {
    if (typeof error === "string")
        return error;
    if (error instanceof Error)
        return error.message;
    return String(error);
}
//# sourceMappingURL=result.js.map