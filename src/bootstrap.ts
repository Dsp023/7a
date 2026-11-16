import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { StringValidation } from "zod/v3";
import { custom } from "zod";
import { pt } from "zod/locales";

export interface WorkspacePaths{
    rootDir: string;
    workspaceDir: string;
    tokenPath: string;
    soulPath: string;
    userPath: string;
    memoryPath: string;
    pendingMemoryPath: string;
    sessionsDir: string;
    skillsDir: string;
    skillsLockPath: string;
    auditLogPath: string;
    usageLogPath: string;
    sqliteIndexPath: string;
}
export function expandHome(inputPath: string): string {
    if(inputPath === "~") return os.homedir();
    if(inputPath.startsWith("~/") || inputPath.startsWith("~\\")){
        return path.join(os.homedir(),inputPath.slice(2));

    }
    return path.resolve(inputPath);
}
export async function writeIfMissing(filePath: string,
    content: string): Promise<void> {
        try{
            await fs.writeFile(filePath,content,{
                encoding:"utf-8",
                mode:0o600,
                flag:"wx"
            });
        }catch(err: unknown){
            if((err as NodeJS.ErrnoException).code !== "EEXIST"){
                throw err;
            }
        }

    }
export async function bootstrapWorkspace(customRootDir?:string): Promise<WorkspacePaths>{
    const rootDir = customRootDir ? expandHome(customRootDir) : path.join(os.homedir(),".7a");
    const workspaceDir = path.join(rootDir,"workspace");
    const paths: WorkspacePaths={
        rootDir,
        workspaceDir,
        tokenPath: path.join(rootDir,"gateway.token"),
        soulPath: path.join(workspaceDir,"SOUL.md"),
        userPath: path.join(workspaceDir, "USER.md"),
        memoryPath: path.join(workspaceDir, "MEMORY.md"),
        pendingMemoryPath: path.join(workspaceDir, "MEMORY.pending.md"),
        sessionsDir: path.join(workspaceDir, "sessions"),
        skillsDir: path.join(workspaceDir, "skills"),
        skillsLockPath: path.join(workspaceDir, "skills", "skills.lock"),
        auditLogPath: path.join(workspaceDir, "audit.jsonl"),
        usageLogPath: path.join(workspaceDir, "usage.jsonl"),
        sqliteIndexPath: path.join(workspaceDir, "index.sqlite"),
  };
    const dirs= [rootDir, workspaceDir,paths.sessionsDir,paths.skillsDir];
    for(const dir of dirs){
        await fs.mkdir(dir,{recursive: true,mode:0o700});
    }
    const token = crypto.randomBytes(32).toString("hex") + "\n";
    await writeIfMissing(paths.tokenPath,token);
    
    await writeIfMissing(paths.soulPath,"# SOUL\n\n");
    await writeIfMissing(paths.userPath,"# USER\n<-- User Profile & Prefrence-->\n");
    await writeIfMissing(paths.memoryPath, "# Memory\n<!-- 7a:memory v1. Edited by 7A and by you. One fact per line. -->\n");
    await writeIfMissing(paths.pendingMemoryPath, "# Pending Memory\n<!-- Quarantined candidate facts waiting for user approval. -->\n");
    await writeIfMissing(paths.skillsLockPath, "{}\n");

  return paths;
}

