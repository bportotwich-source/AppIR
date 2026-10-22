// Componentes do design system (design/design-system/components). O bundle
// é um script que lê o React de window e publica window.MeuMEI.

import * as React from 'react'
import type { ComponentType } from 'react'
import type {
  AccumulatedChartProps, AnimatedNumberProps, CountdownRingProps, LimitTrackProps, LimitGaugeProps, MonthBarsProps, MonthChartProps, ReviewDeckProps, ScanDropProps, SplitBarProps,
} from '../../design/design-system/components/index'

declare global {
  interface Window {
    React: typeof React
    MeuMEI: {
      LimitGauge: ComponentType<LimitGaugeProps>
      AccumulatedChart: ComponentType<AccumulatedChartProps>
      LimitTrack: ComponentType<LimitTrackProps>
      AnimatedNumber: ComponentType<AnimatedNumberProps>
      MonthBars: ComponentType<MonthBarsProps>
      MonthChart: ComponentType<MonthChartProps>
      SplitBar: ComponentType<SplitBarProps>
      ReviewDeck: ComponentType<ReviewDeckProps>
      CountdownRing: ComponentType<CountdownRingProps>
      ScanDrop: ComponentType<ScanDropProps>
    }
  }
}

window.React = React
