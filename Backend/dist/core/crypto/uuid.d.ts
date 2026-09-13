export type UUID = string & {
    readonly __brand: unique symbol;
};
export declare function genUUID(): UUID;
export declare function isValidUUID(uuid: string): boolean;
//# sourceMappingURL=uuid.d.ts.map