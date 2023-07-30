
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

### Primitives 

```ts
const toggleBucket = new Bucket({ defaultValue: false })

// Access buckets from anywhere in the code
const isActive = toggleBucket.get()
toggleBucket.set(!isActive)

// Listen to changes in components
const Compo = () => {
  const isActive = toggleBucket.useValue()
  const toggle = () =>
  toggleBucket.set(!isActive)
}
```

### Advanced 

```ts
interface Counter {
  count: number
}

// A simple persisted bucket
export const counterBucket = new Bucket<Counter>({
  defaultValue: { count: 0 },
  persistKey: 'counter-bucket'
})

// Use the helpers `keyed*Bucket`
// ... to get a single instance for each id
export const counterBucketForId = (id: string) =>
  keyedBucket<Counter>({
  defaultValue: { count: 0 },
  persistKey: `my-bucket-${id}` // Optional
  }, `bucket-${id}`)
```

Now let's use our buckets 

```ts
// Use in components
const Compo = ({ id }: { id: string }) => {
  const value = counterBucketForId(id).useValue() // { count: 0 }
  
  const increment = () =>
    counterBucket.set(state => ({ ...state, count: state.count + 1 })
}
```

## Custom

Extend the base buckets to hold your app logic

```ts
// Custom bucket
class CounterBucket extends Bucket<Counter> {
  // Selectors
  useCount = () =>
    this.useSelector(state => state.count)

  // Modifiers
  incrementCount = () => this.set(state => ({ ...state, count: state.count + 1 })
  resetCount = () => this.set(0)
}

export const counterBucket = new CounterBucket({
  defaultValue: { count: 0 }
})
```

Use your new bucket as any other: 

```ts
const Compo = ({ id }: { id: string }) => {
  const count = customBucket.useCount() // 0
  
  const increment = () =>
    customBucket.incrementCount()
  const reset = () =>
    customBucket.resetCount()
}
```

## Fetcher Buckets (Custom)

Extension to fetch data and automatically fill the bucket value with it (can be disabled using `sideEffect` config)

```ts
interface FetcherBucketConfig<T> extends BucketConfig<T> {
  method?: FetchMethod
  path: string
  sideEffect?: (val: T) => void
}
```

```ts
interface CounterResponse {
  count: number
}

// Simple fetcher
const counterFetcherBucket = new FetcherBucket<CounterResponse>({
  path: `/users/counter`,
  defaultValue: { count: 0 }
})
  
// Keyed fetcher
const counterFetcherBucket = (id: string) =>
  keyedFetcherBucket<CounterResponse>({
    path: `/users/${id}/counter`,
    defaultValue: { count: 0 }
  })
```
Usage: 

```ts
const Compo = ({ id }: { id: string }) => {
  // With `useQuery` candy
  const { data: counter, loading, error, refetch } =
  counterFetcherBucket(id).useQuery()
  
  // Without `useQuery`
  const refetch = counterFetcherBucket(id).useQueryTrigger()
  const fetched = counterFetcherBucket(id).useFetched()
  const loading = counterFetcherBucket(id).useLoading()
  const error = counterFetcherBucket(id).useError()
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
const updateCounterMutatorBucket = new MutatorBucket<UpdateCounterParams>({
  path: `/users/counter`
})

// Keyed Mutator
const updateCounterMutatorBucket = (id: string) =>
  keyedMutatorBucket<UpdateCounterParams, UpdateCounterResponse>({
       path: `/users/${id}/counter`,
  })
```

Usage:

```ts
const Compo = ({ id }: { id: string }) => {
  // With `useQuery` candy
  const { data: response, loading, error, refetch } =
  updateCounterMutatorBucket(id).useQuery() // will not trigger mutator on mount

  // Without `useQuery`
  updateCounter = async (newCount: number) => {
  const { lastUpdatedAt } = await updateCounterMutatorBucket(id).mutate({
  newCount
  })
  }
}
```

## Paginated Fetcher Buckets (Custom)

Extension for pagination (adapted for infinite mobile scroll & REST API)

```ts
interface PaginatedFetcherBucketConfig<T> extends FetcherBucketConfig<T> {
  aggregate?: (prev: T, next: T) => T
  formatPath?: (page: number, limit: number) => string
  isEnded?: (next: T, limit: number) => boolean
  limit?: number
}
```

```ts
type Counters = Array<Counter>

// Simple path
const countersPaginatedFetcherBucket = new PaginatedFetcherBucket<Counters>({
  path: `/user/counters`,
  limit: 20
})
  
// Keyed path
const countersPaginatedFetcherBucket = (id: string) =>
  keyedPaginatedFetcherBucket<Counters>({
  path: `/user/${id}/counters`, // used as "unique key"
  limit: 20
  })

// Keyed Custom path
const countersPaginatedFetcherBucket = (id: string) =>
  keyedPaginatedFetcherBucket<Counters>({
  formatPath: (page: number, limit: number) =>
  `/user/${id}/counters/?color=red&page=${page}&limit=${limit}`
  }, `user-counters-${id}`)  // Must provide a "unique key" as "path" doesn't exist

```
Usage example

```jsx

const Compo = ({ id }: { id: string }) => {
  // With `useQuery` candy
  const { data: counters, loading, refetch, loadMore, loadingMore, hasReachedEnd } =
  countersPaginatedFetcherBucket(id).useQuery()
  
  // Without `useQuery`
  const refetchFirstPage = countersPaginatedFetcherBucket(id).useQueryTrigger()
  const loadMore = countersPaginatedFetcherBucket(id).useLoadMore()
  const loadingMore = countersPaginatedFetcherBucket(id).useLoadingMore()
  ...
  
  const  renderCounter  = (item:  Counter, index:  number) =>
    <CounterItem  key={index}  counter={item}  />
  
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