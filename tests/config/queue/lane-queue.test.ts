import { describe, expect, it } from "vitest";
import { LaneQueue } from "../../../src/queue/lane-queue.js";
import { AppError } from "../../../src/errors/app-error.js";

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

describe("LaneQueue", () => {
  it("1. enforces strict FIFO ordering within the same lane", async () => {
    const queue = new LaneQueue();
    const events: string[] = [];

    const job1 = queue.enqueue("lane-A", async () => {
      events.push("job1:start");
      await delay(30);
      events.push("job1:end");
      return "first";
    });

    const job2 = queue.enqueue("lane-A", async () => {
      events.push("job2:start");
      events.push("job2:end");
      return "second";
    });

    const results = await Promise.all([job1, job2]);

    expect(results).toEqual(["first", "second"]);
    expect(events).toEqual([
      "job1:start",
      "job1:end",
      "job2:start",
      "job2:end",
    ]);
    expect(queue.getDepth("lane-A")).toBe(0);
    expect(queue.getActiveLaneCount()).toBe(0);
  });

  it("2. executes jobs in different lanes concurrently", async () => {
    const queue = new LaneQueue();
    const events: string[] = [];

    const laneA = queue.enqueue("lane-A", async () => {
      events.push("lane-A:start");
      await delay(30);
      events.push("lane-A:end");
      return "A";
    });

    const laneB = queue.enqueue("lane-B", async () => {
      events.push("lane-B:start");
      await delay(10);
      events.push("lane-B:end");
      return "B";
    });

    expect(queue.getActiveLaneCount()).toBe(2);

    const results = await Promise.all([laneA, laneB]);

    expect(results).toEqual(["A", "B"]);
    expect(events.indexOf("lane-B:start")).toBeLessThan(
      events.indexOf("lane-A:end")
    );
    expect(events.indexOf("lane-B:end")).toBeLessThan(
      events.indexOf("lane-A:end")
    );
    expect(queue.getActiveLaneCount()).toBe(0);
  });

  it("3. isolates errors so a failed job does not block subsequent jobs in the same lane", async () => {
    const queue = new LaneQueue();

    const failingJob = queue.enqueue("lane-A", async () => {
      await delay(15);
      throw new Error("Boom in job 1");
    });

    const healthyJob = queue.enqueue("lane-A", async () => {
      return "recovered";
    });

    await expect(failingJob).rejects.toThrow("Boom in job 1");
    await expect(healthyJob).resolves.toBe("recovered");

    await delay(0);
    expect(queue.getDepth("lane-A")).toBe(0);
    expect(queue.getActiveLaneCount()).toBe(0);
  });

  it("4. rejects with 429 QUEUE_FULL AppError when maxQueueDepth is exceeded", async () => {
    const queue = new LaneQueue({ maxQueueDepth: 2 });

    const job1 = queue.enqueue("lane-A", async () => {
      await delay(30);
      return 1;
    });

    const job2 = queue.enqueue("lane-A", async () => {
      await delay(30);
      return 2;
    });

    expect(queue.getDepth("lane-A")).toBe(2);

    await expect(
      queue.enqueue("lane-A", async () => 3)
    ).rejects.toMatchObject({
      name: "AppError",
      statusCode: 429,
      code: "QUEUE_FULL",
    });

    try {
      await queue.enqueue("lane-A", async () => 4);
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).statusCode).toBe(429);
      expect((err as AppError).code).toBe("QUEUE_FULL");
    }

    await expect(Promise.all([job1, job2])).resolves.toEqual([1, 2]);
    await delay(0);
    expect(queue.getDepth("lane-A")).toBe(0);
    expect(queue.getActiveLaneCount()).toBe(0);
  });
});