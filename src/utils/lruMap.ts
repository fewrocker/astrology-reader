export class LruMap<K, V> extends Map<K, V> {
  constructor(private readonly capacity: number) { super() }
  set(key: K, value: V): this {
    if (this.has(key)) this.delete(key)
    else if (this.size >= this.capacity) this.delete(this.keys().next().value as K)
    return super.set(key, value)
  }
}
