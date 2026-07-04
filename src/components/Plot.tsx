import { useEffect, useRef } from 'react'
import Plotly from 'plotly.js-dist-min'

interface Props {
  data: Plotly.Data[]
  layout: Partial<Plotly.Layout>
  config?: Partial<Plotly.Config>
  style?: React.CSSProperties
}

export default function Plot({ data, layout, config, style }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    Plotly.newPlot(el, data, layout, {
      responsive: true,
      displaylogo: false,
      ...config,
    })

    const handle = () => {
      if (ref.current) Plotly.Plots.resize(ref.current)
    }
    window.addEventListener('resize', handle)
    return () => {
      window.removeEventListener('resize', handle)
      if (ref.current) Plotly.purge(ref.current)
    }
  }, [data, layout, config])

  return <div ref={ref} style={{ width: '100%', ...style }} />
}
