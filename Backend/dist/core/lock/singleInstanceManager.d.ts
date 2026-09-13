import { StandardResult } from "../flow/result.js";
export interface InstanceLockMetadata {
    pid: number;
    nodeId: string;
    port: number;
    startedAt: string;
    hostname: string;
}
declare class SingleInstanceManagerImpl {
    private localLockPath;
    private isLocalLocked;
    private clusterKey;
    private renewalTimer;
    private currentNodeId;
    private currentPort;
    private exitHandlerRegistered;
    /**
     * 判断指定 PID 对应的进程是否在当前操作系统中真实存活
     */
    isProcessAlive(pid: number): boolean;
    /**
     * 获取本地操作系统级 PID 文件排他锁 (.instance.lock)
     */
    acquireLocalLock(options?: {
        nodeId?: string;
        port?: number;
        lockPath?: string;
    }): StandardResult<InstanceLockMetadata>;
    /**
     * 释放本地 PID 文件锁
     */
    releaseLocalLock(): StandardResult<boolean>;
    /**
     * 单进程架构下，集群锁已统一由本地操作系统排他锁守护，保留此接口返回成功以保持兼容性
     */
    acquireClusterLock(_nodeId?: string, _port?: number): Promise<StandardResult<boolean>>;
    /**
     * 释放集群分布式锁（单进程架构下空实现）
     */
    releaseClusterLock(): Promise<StandardResult<boolean>>;
    /**
     * 统一释放所有单实例互斥锁
     */
    releaseAll(): Promise<void>;
}
export declare const SingleInstanceManager: SingleInstanceManagerImpl;
export {};
//# sourceMappingURL=singleInstanceManager.d.ts.map