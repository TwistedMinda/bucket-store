/* eslint-disable no-console */
import { useEffect } from 'react'
import Config from 'react-native-config'

import { QueryOptions } from '@api/api'
import { Bucket, BucketConfig } from '@components/fun/base-bucket/bucket'
import captureException from '@services/capture-exceptions'
import { wait } from '@services/time'

const BASE = Config.AWS_HOST as string

const test = () => [
  { id: Math.random(), name: 'Okay' },
  { id: Math.random(), name: 'Oka2y' },
  { id: Math.random(), name: 'Okayzdqzd' },
  { id: Math.random(), name: 'Oka2yzdqzd' },
  { id: Math.random(), name: 'Okayaaa' },
  { id: Math.random(), name: 'Oka2yazd' },
  { id: Math.random(), name: 'Okayaz' },
  { id: Math.random(), name: 'Oka2ydqzdq' },
  { id: Math.random(), name: 'Okayaz' },
  { id: Math.random(), name: 'Oka2ydqzdq' }
]

export type FetchMethod = 'GET' | 'POST'
export interface SuspenseQuery { read: () => any }
export interface FetcherBucketConfig<T> extends BucketConfig<T> {
  method?: FetchMethod
  path: string
  sideEffect?: (val: T) => void
}

export class FetcherBucket<T, P = undefined, E = unknown> extends Bucket<T> {
  protected page = 0
  protected reachedEnd = false
  protected readonly queries: Record<string, SuspenseQuery> = {}
  protected readonly loading?: Bucket<boolean>
  protected readonly fetched?: Bucket<boolean>
  protected readonly error?: Bucket<E>
  protected config: FetcherBucketConfig<T> = {
    path: ''
  }

  constructor (config: FetcherBucketConfig<T>) {
    super(config)
    this.config = config
    this.loading = new Bucket({ defaultValue: false })
    this.error = new Bucket<E>()
    this.fetched = new Bucket({ defaultValue: false })
  }

  readonly useLoading = () => this.loading?.useValue() ?? false
  readonly useError = () => this.error?.useValue() ?? null
  readonly useFetched = () => this.fetched?.useValue() ?? false

  protected getPath = () => this.config.path

  protected readonly fetch = async (params?: P) => {
    this.loading?.set(true)
    try {
      const res = await bucketFetch<T, P>(
        this.getPath(),
        this.config.method ?? 'GET',
        params
      )
      await wait(800)
      this.fetched?.set(true)
      if (this.config.sideEffect) {
        this.config.sideEffect(res)
      } else {
        this.set(res)
      }

      return res
    } catch (err) {
      this.error?.set(err as E)
      throw err
    } finally {
      this.loading?.set(false)
    }
  }

  // Suspense
  useSuspenseQuery = (): T | undefined => {
    const path = this.getPath()
    if (!this.queries[path]) {
      this.queries[path] = suspense(this.fetch(undefined as unknown as P))
    }

    return this.queries[path].read()
  }

  // Queries
  readonly useQueryTrigger = (config: QueryOptions = {}) => {
    useEffect(() => {
      if (config.refreshOnMount !== false) {
        this.fetch(undefined as unknown as P).catch(captureException)
      }
    }, [])

    return this.fetch
  }

  readonly useQuery = (config: QueryOptions = {}) => {
    const refetch = this.useQueryTrigger(config)
    const value = this.useValue()
    const loading = this.useLoading()
    const fetched = this.useFetched()
    const error = this.useError()

    return {
      data: value,
      error,
      loading,
      fetched,
      refetch
    }
  }
}

export const bucketFetch = async <ResponseType, ParamsType = undefined>(
  url: string,
  method: 'GET' | 'POST',
  params?: ParamsType
) => {
  const path = `${BASE}${url}`
  console.log('>', path)
  const res = await fetch(path, { method, body: JSON.stringify(params) })
    .then(async val => await val.json())
  if (res.error) {
    // throw res.error
  }
  const data = res.data

  return (data ?? test()) as ResponseType
}

export const suspense = (promise: Promise<unknown>): SuspenseQuery => {
  let status = 'pending'
  let response: unknown

  const suspender = promise.then(
    (res: unknown) => {
      status = 'success'
      response = res
    },
    (err: unknown) => {
      status = 'error'
      response = err
    }
  )
  const read = () => {
    switch (status) {
      case 'pending':
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw suspender
      case 'error':
        throw response
      default:
        return response
    }
  }

  return { read }
}

export const keyedFetcherBucket = <T, P>(config: FetcherBucketConfig<T>, uniqueKey?: string) =>
  Bucket.singleton(uniqueKey ?? config.path, () => new FetcherBucket<T, P>(config))
