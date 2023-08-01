

# Why
The idea is to propose a set of entreprise-ready standards for the most common required tools for building an app: fetching data, storing it, persisting it, and get types for all of it

- ✅ Compact, No boiler-plate
- ✅ Easy-to-read, Merge Requests friendly
- ✅ All-in-one solution (fetch, store, persist and customizable)
- ✅ Simple, ~500 lines of internal code
- ✅ Fully written in TypeScript

## Buckets

A bucket is a very straightforward entity:

- It stores a value
- It can be persisted to local storage

```ts
interface BucketConfig<T> {
  defaultValue?: T
  persistKey?: string
}

interface Bucket<T> {
  constructor (config: BucketConfig<T>)
  get: () => T
  set: (newValue: T) => void
  useValue(): T
  useSelector: <V>(state: T) => V
}
```

### Basics 

 **Create buckets**

```ts

interface Counter {
  count: number
}

const toggleBucket = new Bucket({ defaultValue: false })

const counterBucket = new Bucket<Counter>({
  defaultValue: { count: 0 },
  persistKey: 'counter-bucket' // Persisting to AsyncStorage
})

```

 **Access buckets**
 
 Access buckets from anywhere in the code
 
```ts
const isActive = toggleBucket.get()
toggleBucket.set(!isActive)
```

Listen to changes in components using `useValue` or `useSelector`

```ts
const Compo = () => {
  const isActive = toggleBucket.useValue()
  const count = counterBucket.useSelector(state => state.count)
}
```

### Advanced 

**Custom Buckets**

Extend the base buckets to hold your app logic

```ts
// Custom bucket
class CounterBucket extends Bucket<Counter> {
  // Selectors
  useCount = () =>
    this.useSelector(state => state.count)

  // Modifiers
  incrementCount = () =>
    this.set(state => ({ ...state, count: state.count + 1 }))
  resetCount = () =>
    this.set(0)
}

const counterBucket = new CounterBucket({
  defaultValue: { count: 0 }
})

// Use in components as other buckets
const Compo = ({ id }: { id: string }) => {
  const count = customBucket.useCount() // 0
  
  const increment = () =>
    customBucket.incrementCount()
  const reset = () =>
    customBucket.resetCount()
}
```

**Keyed buckets**

Often times we need multiple instances of a bucket given parameters. For the base buckets, there are helpers `keyed[BucketType]Bucket` to easily get a singleton.

```ts
const counterBucket = (id: string) =>
  keyedBucket<Counter>({
    defaultValue: { count: 0 },
  }, `bucket-${id}`)
```

For your own buckets, you will have to use `Bucket.singleton()` manually.

```ts
const counterBucket = (id: string) =>
  Bucket.singleton(`bucket-${id}`, () => new CounterBucket({
    defaultValue: { count: 0 },
  }))
```

## Fetcher Buckets (Custom)

Custom Bucket to fetch data
- by default, it automatically fills the value with the request response (use `sideEffect` to override behavior)

```ts
interface FetcherBucketConfig<T> extends BucketConfig<T> {
  method?: FetchMethod
  path: string
  sideEffect?: (val: T) => void
}
```

Simply create your buckets and you're good to go.

*Note that `path` is automatically used as unique key by the keyed helper (still possible to give your own key for edge cases)*

```ts
interface CounterResponse {
  count: number
}

// Simple fetcher
const counterBucket = new FetcherBucket<CounterResponse>({
  path: `/users/counter`,
  defaultValue: { count: 0 }
})
  
// Keyed fetcher
const counterBucket = (id: string) =>
  keyedFetcherBucket<CounterResponse>({
    path: `/users/${id}/counter`, // used as "unique key"
    defaultValue: { count: 0 }
  })
```
Usage: 

```ts
const Compo = ({ id }: { id: string }) => {
  // With `useQuery` candy
  // will trigger a request on mount
  const { data: counter, loading, error, refetch } =
    counterBucket(id).useQuery()
  
  // Without `useQuery`
  const refetch = counterBucket(id).useQueryTrigger()
  const fetched = counterBucket(id).useFetched()
  const loading = counterBucket(id).useLoading()
  const error = counterBucket(id).useError()
}
```

There are also "Mutators", the candy for POST fetchers

```ts
interface UpdateCounterParams {
  newCounter: number
}
interface UpdateCounterResponse {
  lastUpdatedAt: Date
}

// Simple Mutator
const updateCounterBucket = new MutatorBucket<UpdateCounterParams>({
  path: `/users/counter`
})

// Keyed Mutator
const updateCounterBucket = (id: string) =>
  keyedMutatorBucket<UpdateCounterParams, UpdateCounterResponse>({
    path: `/users/${id}/counter`, // used as "unique key"
  })
```

Usage:

```ts
const Compo = ({ id }: { id: string }) => {
  // With `useQuery` candy
  // will NOT trigger a request on mount for mutators
  const { data: response, loading, error, refetch } =
    updateCounterBucket(id).useQuery()
  
  updateCounter = async (newCount: number) => {
    await refetch({
      newCount
    })
  }

  // Without `useQuery`
  const loading = updateCounterBucket(id).useLoading()
  const refetch = updateCounterBucket(id).useMutate()
  updateCounter = async (newCount: number) => {
    const { lastUpdatedAt } = await refetch(id).mutate({
      newCount
    })
  }
}
```

## Paginated Fetcher Buckets (Custom)

Custom Bucket for pagination (adapted for infinite mobile scroll & REST API)
- by default, it automatically adds ?page=0&limit=10 to your path (use `formatPath` to override behavior)
- by default, it expects the API to return an array (use `aggregate` to override behavior)
- by default, it stops when results count is below `limit` config (use `isEnded` to override behavior)

```ts
interface PaginatedFetcherBucketConfig<T> extends FetcherBucketConfig<T> {
  aggregate?: (prev: T, next: T) => T
  formatPath?: (page: number, limit: number) => string
  isEnded?: (next: T, limit: number) => boolean
  limit?: number
}
```

Simply create your buckets and you're good to go.

*Note that `path` is automatically used as unique key by the keyed helper (still possible to give your own key for edge cases)*

```ts
type Counters = Array<Counter>

// Simple path
const countersBucket = new PaginatedFetcherBucket<Counters>({
  path: `/user/counters`,
  limit: 20
})
  
// Keyed path
const countersBucket = (id: string) =>
  keyedPaginatedFetcherBucket<Counters>({
    path: `/user/${id}/counters`, // used as "unique key"
    limit: 20
  })
```

Because `?page=0&limit=0` is automatically added, you need to use `formatPath` if you have more parameters.
*Note that you must provide a unique key to the keyed helper as `path` is not defined.*

```ts
// Keyed Custom path
const countersBucket = (id: string, color: string) =>
  keyedPaginatedFetcherBucket<Counters>({
    formatPath: (page: number, limit: number) =>
      `/user/${id}/counters?color=${color}&page=${page}&limit=${limit}`
  }, `user-counters-${id}-${color}`)  // Must provide a "unique key" as "path" doesn't exist

```

Usage example

```jsx

const Compo = ({ id }: { id: string }) => {
  // With `useQuery` candy
  const { data: counters, loading, refetch, loadMore, loadingMore, hasReachedEnd } =
    countersBucket(id).useQuery()
  
  // Without `useQuery`
  const refetchFirstPage = countersBucket(id).useQueryTrigger()
  const loadMore = countersBucket(id).useLoadMore()
  const loadingMore = countersBucket(id).useLoadingMore()
  ...
  
  const renderCounter = (item: Counter, index: number) =>
    <CounterItem key={index} counter={item} />
  
  return (
    <FlatList
      ListFooterComponent={loadingMore ? <Text>Loading more...</Text> : null}
      data={counters}
      onRefresh={refetch}
      onEndReached={loadMore}
      renderItem={({ index, item }) => renderCounter(item, index)}
    />
  )
}
```
