/** Bound concurrent image decodes to avoid startup memory spikes. Urgent animation
 * requests overtake pending scenery; uploads never occupy a decode slot. */
export class DecodeQueue {
  private active = 0;
  private readonly urgent: (() => void)[] = [];
  private readonly normal: (() => void)[] = [];
  constructor(private readonly limit = 4) {
    if (!Number.isInteger(limit) || limit < 1) throw new Error('Invalid decode concurrency');
  }
  /** Queue decode work and preserve its result/rejection for the caller. Urgency
   * only reorders waiting work; it never interrupts an active decode. A slot is
   * released even when task throws synchronously or its promise rejects. */
  run<T>(task: () => Promise<T>, urgent = false): Promise<T> {
    return new Promise<T>((resolve,reject)=>{
      const start=()=>{
        this.active++;
        Promise.resolve().then(task).then(resolve,reject).finally(()=>{this.active--;this.drain();});
      };
      (urgent?this.urgent:this.normal).push(start);this.drain();
    });
  }
  private drain(): void {
    while(this.active<this.limit){
      const task=this.urgent.shift()??this.normal.shift();if(!task)return;task();
    }
  }
}
