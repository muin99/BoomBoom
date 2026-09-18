import { Inject, Injectable } from "@nestjs/common";
import { APP_CONFIG } from "../../config/configuration.module";
import { Config } from "../../config/environment";
import { Directive } from "../models/directive.model";

@Injectable()
export class InterpretationCacheService {
  private readonly cache = new Map<
    string,
    { expires: number; entries: Directive[] }
  >();
  private readonly pending = new Map<string, Promise<Directive[]>>();

  constructor(@Inject(APP_CONFIG) private readonly config: Config) {}

  /** The loader must validate model output before resolving. Failed loads are never cached. */
  async getOrCompute(
    key: string,
    loader: () => Promise<Directive[]>,
  ): Promise<Directive[]> {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now())
      return structuredClone(cached.entries);
    this.cache.delete(key);

    const existing = this.pending.get(key);
    if (existing) return structuredClone(await existing);

    const task = loader();
    this.pending.set(key, task);
    try {
      const entries = await task;
      if (this.config.cacheMax > 0 && this.config.cacheTtl > 0) {
        if (this.cache.size >= this.config.cacheMax) {
          this.cache.delete(this.cache.keys().next().value!);
        }
        this.cache.set(key, {
          expires: Date.now() + this.config.cacheTtl,
          entries: structuredClone(entries),
        });
      }
      return structuredClone(entries);
    } finally {
      this.pending.delete(key);
    }
  }
}
