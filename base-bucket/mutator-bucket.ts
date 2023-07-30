import { QueryOptions } from '@api/api'
import { Bucket } from '@components/fun/base-bucket/bucket'
import { FetcherBucket, FetcherBucketConfig } from '@components/fun/base-bucket/fetcher-bucket'

export class MutatorBucket<P = undefined, T = undefined> extends FetcherBucket<T, P> {
  constructor (config: FetcherBucketConfig<T>) {
    super({
      method: 'POST',
      ...config
    })
  }

  readonly mutate = async (params: P) => await this.fetch(params)
  readonly useMutate = () => this.mutate

  readonly useQuery = (config: QueryOptions = {}) => {
    const refetch = this.useQueryTrigger({ refreshOnMount: false, ...config })
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

export const keyedMutatorBucket = <P = undefined, T = undefined>(config: FetcherBucketConfig<T>, uniqueKey?: string) =>
  Bucket.singleton(uniqueKey ?? config.path, () => new MutatorBucket<P, T>(config))
