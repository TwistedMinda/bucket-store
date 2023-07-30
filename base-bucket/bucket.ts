import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSyncExternalStore } from 'react'

import captureException from '@services/capture-exceptions'

export type Subscriber<T> = (state: T) => void
export type Selector<T, Res> = (state: T) => Res

export interface BucketConfig<T> {
  defaultValue?: T
  persistKey?: string
}

export class Bucket<T> {
  private value: T = undefined as unknown as T
  private readonly subscribers: Set<Subscriber<any>> = new Set()
  protected readonly hydrated?: Bucket<boolean>
  protected config: BucketConfig<T> = {}

  private static readonly instances: Map<string, unknown> = new Map<string, unknown>()

  // Creation
  constructor (config?: BucketConfig<T>) {
    if (config) {
      this.config = config
    }

    if (this.config.defaultValue !== undefined) {
      this.value = this.config.defaultValue
    }

    if (this.config.persistKey) {
      this.hydrated = new Bucket({ defaultValue: false })
      this.hydrate().catch(captureException)
    }
  }

  static singleton = <X>(key: string, creator: () => X) => {
    if (!this.instances.get(key)) {
      this.instances.set(key, creator())
    }

    return this.instances.get(key) as X
  }

  // Accessors
  get = () => this.value
  set = (newValue: T | ((old: T) => T)) => {
    const val = typeof newValue === 'function'
      ? (newValue as ((old: T) => T))(this.value)
      : newValue
    this.value = val
    for (const subscriber of this.subscribers) {
      subscriber(val)
    }
    if (this.config.persistKey) {
      bucketPersistSave(this.config.persistKey, val).catch(captureException)
    }
  }

  private readonly use = <T>(getSnapshot: () => T) => {
    const subscribe = (callback: () => void) => {
      this.subscribers.add(callback)

      return () => {
        this.subscribers.delete(callback)
      }
    }

    return useSyncExternalStore(subscribe, getSnapshot)
  }

  useValue = () =>
    this.use(() => this.value)

  useSelector = <R>(selector: Selector<T, R>) =>
    this.use(() => selector(this.value))

  // Hydrate
  useIsHydrated = () => this.hydrated?.useValue() ?? true

  clearStored = async () => {
    if (this.config.persistKey) {
      await bucketPersistClear(this.config.persistKey)
    }
  }

  hydrate = async () => {
    if (!this.config.persistKey) {
      return
    }
    const stored = await bucketPersistHydrate(this.config.persistKey)
    if (!stored) {
      return
    }

    this.set(stored as T)
    this.hydrated?.set(true)
  }
}

const bucketPersistSave = async (key: string, value: unknown) =>
  await AsyncStorage.setItem(key, JSON.stringify(value))

const bucketPersistClear = async (key: string) =>
  await AsyncStorage.removeItem(key)

const bucketPersistHydrate = async <T>(key: string) =>
  await AsyncStorage.getItem(key)
    .then((res) => res ? JSON.parse(res) : undefined) as T | undefined

export const keyedBucket = <T>(uniqueKey: string, config: BucketConfig<T>) =>
  Bucket.singleton(uniqueKey, () => new Bucket<T>(config))
