// deno-lint-ignore-file no-explicit-any

import { hmac } from './deps.js'

type Fn<Arguments extends unknown[]> = (...args: Arguments) => any
type PromiseWrap<X> = X extends Promise<any> ? X
  : Promise<X>

export class Queue {
  #_queue: [fn: any, args: any[], resolve: any, reject: any][] = []
  #_isRunning = false
  #autostart: boolean

  public constructor(autostart: boolean = true) {
    this.#autostart = autostart
  }

  public push<Arguments extends unknown[], Callback extends Fn<Arguments>>(
    fn: Callback,
    ...args: Arguments
  ): PromiseWrap<ReturnType<Callback>> {
    return new Promise((resolve, reject) => {
      this.#_queue.push([fn, args, resolve, reject])
      if (!this.#_isRunning && this.#autostart) this._run()
    }) as any
  }

  public start() {
    this.#autostart = true
    this._run()
  }

  public stop() {
    this.#autostart = false
    this.#_isRunning = false
  }

  private _run() {
    if (this.#_isRunning || this.#_queue.length < 1) return
    this.#_isRunning = true
    ;(async () => {
      let value = this.#_queue.shift()
      while (this.#_isRunning && value !== undefined) {
        const [fn, args, resolve, reject] = value
        try {
          const value = await fn(...args)
          resolve(value)
        } catch (error) {
          reject(error)
        }
        value = this.#_queue.shift()
      }
      this.#_isRunning = false
    })()
  }
}

export const computeSignature = (secret: string, payload: unknown, time: number) => {
  const msg = `${time}.${JSON.stringify(payload, null, 0)}`
  const signature = hmac('sha256', secret, msg, 'utf8', 'hex')
  return signature
}
