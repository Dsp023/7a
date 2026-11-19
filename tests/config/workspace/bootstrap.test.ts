import { describe ,it , expect , beforeEach,afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {bootstrapWorkspace,expandHome } from "../../../src/bootstrap.js";

describe("Workspace Bootstrapper",() =>{
    let testRootDir: string;
    beforeEach(async () =>{
        testRootDir = await fs.mkdtemp(path.join(os.tmpdir(),"7a-test-"));
    });
    afterEach(async () =>{
        await fs.rm(testRootDir,{recursive:true ,force:true});
    });
    it("expandHome correctly resolve ~ to the user's home directory",() =>{
        expect(expandHome("~")).toBe(os.homedir());
        expect(expandHome("~/test")).toBe(path.join(os.homedir(),"test"));
        expect(expandHome("~\\test")).toBe(path.join(os.homedir(),"test"));
    })
    it("bootstraps a fresh workspace with all directories and starter files", async() =>{
        const paths = await bootstrapWorkspace(testRootDir);
        const token = await fs.readFile(paths.tokenPath,"utf-8");
        expect(token.trim()).toHaveLength(64);
    const soul = await fs.readFile(paths.soulPath, "utf-8");
    expect(soul).toContain("# SOUL");
    const memory = await fs.readFile(paths.memoryPath,"utf-8");
expect(memory).toContain("# Memory")
    const lock = await fs.readFile(paths.skillsLockPath, "utf-8");
    expect(lock.trim()).toBe("{}");
    const sessionsStat = await fs.stat(paths.sessionsDir);
    expect(sessionsStat.isDirectory()).toBe(true);
  });
  it("is idempotent and NEVER overwrites existing memories or token", async () => {
    const paths = await bootstrapWorkspace(testRootDir);
    const originalToken = await fs.readFile(paths.tokenPath, "utf-8");
    const customMemory = "# Memory\n- [m_01] User loves TypeScript.\n";
    await fs.writeFile(paths.memoryPath, customMemory, "utf-8");
    await bootstrapWorkspace(testRootDir);

    const memoryAfter = await fs.readFile(paths.memoryPath, "utf-8");
    expect(memoryAfter).toBe(customMemory);

    const tokenAfter = await fs.readFile(paths.tokenPath, "utf-8");
    expect(tokenAfter).toBe(originalToken);
  });
})