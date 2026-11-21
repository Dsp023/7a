import { AppError } from "../errors/app-error.js";
export interface LaneQueueOptions{
    maxQueueDepth?: number;
}
export class LaneQueue{
    private readonly tails = new Map<string,Promise<void>>();
    private readonly depth = new Map<string,number>();
    private readonly maxQueueDepth: number;
    constructor(options: LaneQueueOptions ={}){
        this.maxQueueDepth = options.maxQueueDepth ?? 10;

    }
    getDepth(lane : string): number{
        return this.depth.get(lane) ?? 0;
    }
    getActiveLaneCount(): number{
        return this.tails.size;
    }
    async enqueue<T>(lane: string,job:()=> Promise<T>): Promise<T> {
        const currentDepth = this.getDepth(lane);
        if(currentDepth >= this.maxQueueDepth){
            throw new AppError(
                `Lane '${lane}' queue is full(max: ${this.maxQueueDepth})`,
                429,"QUEUE_FULL"
            );
        }
         this.depth.set(lane ,currentDepth + 1);
        const currentTail = this.tails.get(lane) ?? Promise.resolve();
         const result = currentTail.then(job);
             const newTail = result
      .then(
        () => undefined,
        () => undefined
      )
      .finally(() => {
        const remaining = (this.depth.get(lane) ?? 1) - 1;
        if (remaining <= 0) {
          this.depth.delete(lane);
          this.tails.delete(lane);
        } else {
          this.depth.set(lane, remaining);
        }
      });
    this.tails.set(lane, newTail);
    return result;
  }
    } 
