/* eslint-disable */

import React from 'react'
import { Text } from 'react-native'

export class ErrorBoundary extends React.Component<any> {
  state: any = { hasError: false, error: null }

  static getDerivedStateFromError (error: any) {
    return { hasError: true, error }
  }

  componentDidCatch (error: any, errorInfo: any) {
    console.log(error, errorInfo)
  }

  render () {
    if (this.state.hasError) {
      return (
        <Text>
          Something went wrong:
          {' '}

          {this.state.error?.message ?? 'No message'}
        </Text>
      )
    }

    return this.props.children
  }
}
