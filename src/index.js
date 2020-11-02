import { render } from 'react-dom'
import React, { useState, useRef } from 'react'
import { useTransition, animated } from 'react-spring'
import { useDrag } from 'react-use-gesture'
import data from './data'
import './styles.css'
import useWindowDimensions from './useWindowDimensions'
import useInterval from './useInterval'

function App() {
  const [scroll, setScroll] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [, vh] = useWindowDimensions()
  const container = useRef(null)

  useInterval(() => {
    if (scroll !== 0) {
      container.current.scrollTop += scroll * 10
    }
  }, 10)

  const bind = useDrag(({ xy: [, y], dragging }) => {
    setIsDragging(dragging)
    if (dragging) {
      const boundsSize = 0.15 * vh;
      const topBounds = boundsSize;
      const bottomBounds = vh - boundsSize;
      if (y < topBounds) {
        setScroll((y - topBounds) / boundsSize)
      }
      if (scroll !== 0 && y >= topBounds && y <= bottomBounds) {
        setScroll(0)
      }
      if (y > bottomBounds) {
        setScroll((y - bottomBounds) / boundsSize)
      }
    } else {
      setScroll(0)
    }
  }, {
    passive: false
  })

  /* #region   */
  const [rows, set] = useState(data)
  let height = 0
  const transitions = useTransition(
    rows.map((data) => ({ ...data, y: (height += data.height) - data.height })),
    (d) => d.name,
    {
      from: { height: 0, opacity: 0 },
      leave: { height: 0, opacity: 0 },
      enter: ({ y, height }) => ({ y, height, opacity: 1 }),
      update: ({ y, height }) => ({ y, height })
    }
  )
  /* #endregion */

  return (
    <div ref={container} className="list-container">
      <div className="list" style={{ height }}>
        {transitions.map(({ item, props: { y, ...rest }, key }, index) => (
          <animated.div
            {...bind()}
            key={key}
            className="card"
            style={{
              zIndex: data.length - index,
              transform: y.interpolate((y) => `translate3d(0,${y}px,0)`),
              ...rest
            }}>
            <div className="details" style={{ backgroundImage: item.css }} />
          </animated.div>
        ))}
      </div>
    </div>
  )
}

render(<App />, document.getElementById('root'))
