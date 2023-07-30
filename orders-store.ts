import { Bucket } from '@components/fun/base-bucket/bucket'
import { keyedMutatorBucket } from '@components/fun/base-bucket/mutator-bucket'
import { keyedPaginatedFetcherBucket, PaginatedFetcherBucket } from '@components/fun/base-bucket/paginated-fetcher-bucket'

export interface Order {
  id: string
  name: string
}

/**
 * Orders Bucket
 */

class OrdersBucket extends PaginatedFetcherBucket<Order[]> {
  useOrdersCount = () =>
    this.useSelector(state => state?.length)
}

export const ordersBucket = (id: string) =>
  Bucket.singleton(`orders-${id}`, () => new OrdersBucket({
    path: `/orders/${id}`,
    defaultValue: [],
    persistKey: 'orders-store'
  }))

export const orders2Bucket = (id: string) =>
  keyedPaginatedFetcherBucket<Order[]>({
    path: `/orders2/${id}`,
    defaultValue: [],
    persistKey: 'orders2-store'
  }, `orders-${id}`)

/**
 * Delete Order Bucket
 */

interface DeleteOrderParams {
  id: string
}
export const deleteOrderBucket = (id: string) =>
  keyedMutatorBucket<DeleteOrderParams>({
    path: `/orders/${id}/delete`
  })

/**
 * Favorite Orders Bucket
 */
type FavoritesBucketData = Record<string, boolean>
export const favoritesBucket = new Bucket<FavoritesBucketData>({
  defaultValue: {},
  persistKey: 'favorites-store'
})

/**
 * Selected Orders Bucket
 */
type SelectedBucketData = Record<string, boolean>
class SelectedBucket extends Bucket<SelectedBucketData> {
  constructor () {
    super({
      defaultValue: {}
    })
  }

  useSelectedCount = () =>
    this.useSelector(state => Object.keys(state).length)

  useIsSelectedOrder = (orderId: string) =>
    this.useSelector(state => state?.[orderId])

  selectOrder = (id: string) => {
    const copy = this.get()
    if (copy[id]) {
      delete copy[id]
    } else {
      copy[id] = true
    }
    this.set({ ...copy })
  }

  deleteAllSelected = (id: string) => {
    const rest = ordersBucket(id).get()
      .filter(order => !this.get()[order.id])
    ordersBucket(id).set(rest)
    this.set({})
  }
}

export const selectedBucket = new SelectedBucket()
