/* eslint-disable no-console */
import { Suspense, useEffect } from 'react'
import { FlatList } from 'react-native'
import SplashScreen from 'react-native-splash-screen'

import { ErrorBoundary } from '@components/fun/base-bucket/bucket-error-boundary'
import { deleteOrderBucket, favoritesBucket, Order, orders2Bucket, ordersBucket, selectedBucket } from '@components/fun/orders-store'
import { Flex } from '@ds/base/flex'
import { Pressable } from '@ds/base/pressable'
import { Row } from '@ds/base/row'
import { Text } from '@ds/base/text'
import { borderRadius, useMemoizedTheme } from '@theme'

const userId = 'julien3'

const OrderItem = ({ order }: { order: Order }) => {
  const { theme: { colors } } = useMemoizedTheme()
  const selected = selectedBucket.useIsSelectedOrder(order.id)
  const favorited = favoritesBucket.useSelector(state => state[order.id])

  const select = (id: string) => () =>
    selectedBucket.selectOrder(id)

  const favorite = (id: string) => () => {
    const old = favoritesBucket.get()
    const oldVal = old[id] ?? false
    favoritesBucket.set({ ...old, [id]: !oldVal })
  }

  const remove = (id: string) => async () => {
    try {
      await deleteOrderBucket(id).mutate({
        id: 'hello'
      })
    } catch (err) {
      console.log(JSON.stringify(err, null, 2))
    }
  }

  return (
    <Pressable
      backgroundColor={colors.blue}
      borderRadius={borderRadius.XS}
      justify='space-between'
      mb='small'
      onPress={select(order.id)}
      ph='small'
      pv='micro'
      row
    >
      <Text color={'#fff'}>
        {`${selected ? '[X] - ' : ''} ${order.name} ${favorited ? '- Loved' : ''}`}
      </Text>

      <Row>
        <Pressable onPress={favorite(order.id)}>
          <Text color={colors.lightGrey}>Love</Text>
        </Pressable>

        <Pressable onPress={remove(order.id)}>
          <Text color={colors.red}>Delete</Text>
        </Pressable>
      </Row>
    </Pressable>
  )
}

const OrdersList = () => {
  orders2Bucket(userId).useQueryTrigger()
  const orders2 = orders2Bucket(userId).useValue()
  const { data: orders, loading, loadingMore, loadMore, refetch } = ordersBucket(userId).useQuery()
  console.log('orders', orders.length)
  console.log('orders2', orders2.length)
  const renderOrder = (item: Order, index: number) =>
    <OrderItem key={index} order={item} />

  const fun = async () =>
    await refetch()

  const onEndReached = async () =>
    await loadMore()

  return (
    <>
      <FlatList
        ListFooterComponent={loadingMore ? <Text>Loading more...</Text> : null}
        data={orders}
        keyExtractor={(item) => item.id}
        onEndReached={onEndReached}
        renderItem={({ index, item }) => renderOrder(item, index)}
      />

      <Row justify='flex-end'>
        <Pressable onPress={fun}>
          <Text>{loading ? 'Reloading...' : 'Refetch'}</Text>
        </Pressable>
      </Row>
    </>
  )
}

const Total = () => {
  const total = ordersBucket(userId).useOrdersCount()

  return (
    <Text mb='medium'>
      {`Orders ${Number(total).toFixed(0)}`}
    </Text>
  )
}

const DeleteButton = () => {
  const count = selectedBucket.useSelectedCount()
  const deleteAll = async () =>
    selectedBucket.deleteAllSelected(userId)

  if (count === 0) {
    return (null)
  }

  return (
    <Pressable onPress={deleteAll}>
      <Text>
        {`Delete ${Number(count)} items`}
      </Text>
    </Pressable>
  )
}

export const OrdersScreen = () => {
  const isHydrated = ordersBucket(userId).useIsHydrated()

  useEffect(() => {
    SplashScreen.hide()
  }, [])

  return isHydrated
    ? (
      <Flex p='medium'>
        <Total />

        <ErrorBoundary>
          <Suspense fallback={<Text>Loading...</Text>}>
            <OrdersList />
          </Suspense>
        </ErrorBoundary>

        <DeleteButton />
      </Flex>
    )
    : (
      <Text center mt='large'>Hydrating...</Text>
    )
}
