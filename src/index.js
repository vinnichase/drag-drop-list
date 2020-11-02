import { render } from 'react-dom'
import React, { useState, useRef, useEffect } from 'react'
import { useTransition, animated, useSpring } from 'react-spring'
// import { Spring, animated as anim } from 'react-spring/renderprops'
import { useMove, useScroll } from 'react-use-gesture'
import data from './data'
import './styles.css'
import useWindowDimensions from './useWindowDimensions'

function App() {
  const [scroll, setScroll] = useState(0)
  const [currentScrollTop, setCurrentScrollTop] = useState(0)
  const [scrollHeight, setScrollHeight] = useState(0)
  const [, vh] = useWindowDimensions()
  const container = useRef(null)
  useEffect(() => {
    if (container.current) {
      setScrollHeight(container.current.scrollHeight - container.current.getBoundingClientRect().bottom)
      setCurrentScrollTop(container.current.scrollTop)
    }
  }, [container])
  const scrollSpringConfig = (mass = 12, tension = 12, friction = 19, precision = 0.01, clamp = false) => ({
    mass,
    tension,
    friction,
    precision,
    clamp
  })
  const [scrollSpring, setScrollSpring, stop] = useSpring(() => ({
    reset: true,
    config: scrollSpringConfig()
  }))

  const bind = useMove(({ xy: [, y] }) => {
    if (scroll > -1 && y < 0.15 * vh) {
      setScroll(-1)
      setScrollSpring({
        from: {
          y: currentScrollTop
        },
        to: { y: 0 },
        config: scrollSpringConfig()
      })
    }
    if (scroll !== 0 && y >= 0.15 * vh && y <= 0.85 * vh) {
      console.log(currentScrollTop, scrollSpring.y && Math.floor(scrollSpring.y.getValue()))
      setScroll(0)
      setScrollSpring({
        from: {
          y: currentScrollTop
        },
        to: {
          y: scrollSpring.y ? Math.floor(scrollSpring.y.getValue()) : currentScrollTop
        },
        config: scrollSpringConfig(12, 1, 100),
        onRest: () => console.log('REST'),
        onStart: () => console.log('START')
      })
    }
    if (scroll < 1 && y > 0.85 * vh) {
      setScroll(1)
      setScrollSpring({
        from: {
          y: currentScrollTop
        },
        to: { y: scrollHeight },
        config: scrollSpringConfig()
      })
    }
  })
  useScroll(
    ({ xy: [, y] }) => {
      console.log(y)
      scroll !== 0 && container.current && setCurrentScrollTop(container.current.scrollTop)
    },
    {
      domTarget: container,
      passive: true
    }
  )

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

  return (
    <div className="scrolltop-main">
      <animated.div {...bind()} ref={container} className="list-container" scrollTop={scrollSpring.y}>
        <div className="list" style={{ height }}>
          {transitions.map(({ item, props: { y, ...rest }, key }, index) => (
            <animated.div
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
      </animated.div>
    </div>
  )
}

render(<App />, document.getElementById('root'))
