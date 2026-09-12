import fs from "fs";
import os from "os";
import path from "path";
import { returnError, returnSuccess, StandardResult, tryCatchErrorToString } from "../flow/result.js";
import { LogClient } from "../log/logger.js";

export interface InstanceLockMetadata {
  pid: number;
  nodeId: string;
  port: number;
  startedAt: string;
  hostname: string;
}

class SingleInstanceManagerImpl {
  private localLockPath: string = path.resolve(process.cwd(), ".instance.lock");
  private isLocalLocked: boolean = false;
  private clusterKey: string = "backend:single_instance:lock";
  private renewalTimer: NodeJS.Timeout | null = null;
  private currentNodeId: string = "diary-backend-01";
  private currentPort: number = 8000;
  private exitHandlerRegistered: boolean = false;

  /**
   * 判断指定 PID 对应的进程是否在当前操作系统中真实存活
   */
  public isProcessAlive(pid: number): boolean {
    if (!pid || pid <= 0) return false;
    try {
      // 信号 0 不会杀死进程，仅用于探测进程与权限
      process.kill(pid, 0);
      return true;
    } catch (err: any) {
      return err.code === "EPERM";
    }
  }

  /**
   * 获取本地操作系统级 PID 文件排他锁 (.instance.lock)
   */
  public acquireLocalLock(options?: {
    nodeId?: string;
    port?: number;
    lockPath?: string;
  }): StandardResult<InstanceLockMetadata> {
    try {
      if (options?.lockPath) {
        this.localLockPath = options.lockPath;
      }
      if (options?.nodeId) this.currentNodeId = options.nodeId;
      if (options?.port) this.currentPort = options.port;

      if (fs.existsSync(this.localLockPath)) {
        let existingMeta: InstanceLockMetadata | null = null;
        try {
          const raw = fs.readFileSync(this.localLockPath, "utf-8");
          existingMeta = JSON.parse(raw);
        } catch {
          // 破损文件视为陈旧锁
        }

        if (existingMeta && existingMeta.pid) {
          if (existingMeta.pid === process.pid) {
            this.isLocalLocked = true;
            return returnSuccess(existingMeta);
          }

          if (this.isProcessAlive(existingMeta.pid)) {
            return returnError(
              `本地已存在运行中的后端实例 (PID: ${existingMeta.pid}, Node: ${existingMeta.nodeId}, 启动时间: ${existingMeta.startedAt})`
            );
          } else {
            LogClient.warn(
              `检测到非正常退出遗留的陈旧本地实例锁 (原 PID: ${existingMeta.pid})，正在自愈清理并接管...`,
              undefined,
              "SingleInstance"
            );
            try {
              fs.unlinkSync(this.localLockPath);
            } catch {}
          }
        }
      }

      const meta: InstanceLockMetadata = {
        pid: process.pid,
        nodeId: this.currentNodeId,
        port: this.currentPort,
        startedAt: new Date().toISOString(),
        hostname: os.hostname(),
      };

      fs.writeFileSync(this.localLockPath, JSON.stringify(meta, null, 2), {
        encoding: "utf-8",
        flag: "w",
      });

      this.isLocalLocked = true;

      // 注册退出自动清理钩子
      if (!this.exitHandlerRegistered) {
        this.exitHandlerRegistered = true;
        const cleanup = () => {
          this.releaseLocalLock();
        };
        process.once("exit", cleanup);
      }

      LogClient.info(
        `成功获取本地单实例独占锁 (PID: ${meta.pid}, 文件: ${this.localLockPath})`,
        undefined,
        "SingleInstance"
      );

      return returnSuccess(meta);
    } catch (error) {
      return returnError(`Acquire local instance lock failed: ${tryCatchErrorToString(error)}`);
    }
  }

  /**
   * 释放本地 PID 文件锁
   */
  public releaseLocalLock(): StandardResult<boolean> {
    try {
      if (this.isLocalLocked && fs.existsSync(this.localLockPath)) {
        try {
          const raw = fs.readFileSync(this.localLockPath, "utf-8");
          const parsed = JSON.parse(raw);
          if (parsed.pid === process.pid) {
            fs.unlinkSync(this.localLockPath);
          }
        } catch {
          if (fs.existsSync(this.localLockPath)) {
            fs.unlinkSync(this.localLockPath);
          }
        }
      }
      this.isLocalLocked = false;
      return returnSuccess(true);
    } catch (error) {
      return returnError(`Release local instance lock failed: ${tryCatchErrorToString(error)}`);
    }
  }

  /**
   * 单进程架构下，集群锁已统一由本地操作系统排他锁守护，保留此接口返回成功以保持兼容性
   */
  public async acquireClusterLock(
    _nodeId?: string,
    _port: number = 8000
  ): Promise<StandardResult<boolean>> {
    return returnSuccess(true);
  }

  /**
   * 释放集群分布式锁（单进程架构下空实现）
   */
  public async releaseClusterLock(): Promise<StandardResult<boolean>> {
    return returnSuccess(true);
  }

  /**
   * 统一释放所有单实例互斥锁
   */
  public async releaseAll(): Promise<void> {
    this.releaseLocalLock();
  }
}

export const SingleInstanceManager = new SingleInstanceManagerImpl();
