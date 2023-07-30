import { QueryOptions } from '@api/api'
import { Bucket } from '@components/fun/base-bucket/bucket'
import { bucketFetch, FetcherBucket, FetcherBucketConfig } from '@components/fun/base-bucket/fetcher-bucket'
import { wait } from '@services/time'

const DEFAULT_LIMIT = 10

export interface PaginatedFetcherBucketConfig<T> extends FetcherBucketConfig<T> {
  aggregate?: (prev: T, next: T) => T
  formatPath?: (page: number, limit: number) => string
  isEnded?: (next: T, limit: number) => boolean
  limit?: number
  sideEffect?: (val: T) => void
}

export class PaginatedFetcherBucket<T, P = undefined> extends FetcherBucket<T, P> {
  protected readonly loadingMore?: Bucket<boolean>
  protected config: PaginatedFetcherBucketConfig<T> = {
    path: ''
  }

  constructor (config: PaginatedFetcherBucketConfig<T>) {
    super(config)
    this.config = config
    this.loadingMore = new Bucket({ defaultValue: false })
  }

  readonly useLoadingMore = () => this.loadingMore?.useValue() ?? false

  protected readonly getLimit = () =>
    this.config.limit ?? DEFAULT_LIMIT

  protected readonly getPath = () => {
    const limit = this.getLimit()

    if (this.config.formatPath) {
      return this.config.formatPath(this.page, limit)
    }

    return `${this.config.path}?page=${this.page}&limit=${limit}`
  }

  protected readonly isEnded = (res: T) => {
    const limit = this.getLimit()

    return this.config.isEnded
      ? this.config.isEnded(res, limit)
      : ((res as ArrayLike<T>)?.length ?? 0) < limit
  }

  protected readonly fetch = async (params?: P, nextPage?: boolean) => {
    if (nextPage) {
      if (this.reachedEnd) {
        return this.get()
      }
      this.page += 1
    } else {
      this.page = 0
      this.reachedEnd = false
    }

    nextPage
      ? this.loadingMore?.set(true)
      : this.loading?.set(true)
    try {
      const res = await bucketFetch<T, P>(
        this.getPath(),
        this.config.method ?? 'GET',
        params
      )
      await wait(800)
      if (!nextPage) {
        this.fetched?.set(true)
      }
      if (this.config.sideEffect) {
        this.config.sideEffect(res)
      } else {
        const old = this.get()
        const aggregated =
          nextPage
            ? this.config.aggregate
              ? this.config.aggregate(old, res)
              : Array.isArray(old)
                ? old.concat(res) as T
                : res
            : res
        this.set(aggregated)
      }
      const ended = this.isEnded(res)
      this.reachedEnd = ended

      return res
    } catch (err) {
      this.error?.set(err)
      throw err
    } finally {
      nextPage
        ? this.loadingMore?.set(false)
        : this.loading?.set(false)
    }
  }

  readonly useLoadMore = () => {
    const loadMore = async (params?: P) =>
      await this.fetch(params, true)

    return loadMore
  }

  readonly useQuery = (config: QueryOptions = {}) => {
    const refetch = this.useQueryTrigger(config)
    const value = this.useValue()
    const loading = this.useLoading()
    const loadingMore = this.useLoadingMore()
    const fetched = this.useFetched()
    const error = this.useError()

    const hasReachedEnd = () => this.reachedEnd
    const loadMore = async (params?: P) =>
      await this.fetch(params, true)

    return {
      data: value,
      error,
      loading,
      loadingMore,
      fetched,
      refetch,
      hasReachedEnd,
      loadMore
    }
  }
}

export const keyedPaginatedFetcherBucket = <T, P = undefined>(config: PaginatedFetcherBucketConfig<T>, uniqueKey?: string) =>
  Bucket.singleton(uniqueKey ?? config.path, () => new PaginatedFetcherBucket<T, P>(config))
