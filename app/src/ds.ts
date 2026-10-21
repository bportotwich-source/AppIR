// Componentes do design system (design/design-system/components). O bundle
// é um script que lê o React de window e publica window.MeuMEI.

import * as React from 'react'
import type { ComponentType } from 'react'
import type {
  AnimatedNumberProps, CountdownRingProps, LimitGaugeProps, MonthBarsProps, ReviewDeckProps, SplitBarProps,
} from '../../design/design-system/components/index'

declare global {
  interface Window {
    React: typeof React
    MeuMEI: {
      LimitGauge: ComponentType<LimitGaugeProps>
      AnimatedNumber: ComponentType<AnimatedNumberProps>
      MonthBars: ComponentType<MonthBarsProps>
      SplitBar: ComponentType<SplitBarProps>
      ReviewDeck: ComponentType<ReviewDeckProps>
      CountdownRing: ComponentType<CountdownRingProps>
    }
  }
}

window.React = React
