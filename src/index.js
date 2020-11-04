/* eslint-disable no-multi-assign */
/* eslint-disable react/jsx-props-no-spreading */
import * as R from 'ramda';
import { render } from 'react-dom';
import React, { useState, useRef } from 'react';
import { animated, useSprings, interpolate } from 'react-spring';
import { useDrag } from 'react-use-gesture';
import clamp from 'lodash-es/clamp';
import move from 'lodash-move';
import data from './data';
import './styles.css';
import useWindowDimensions from './useWindowDimensions';
import useInterval from './useInterval';

// Returns fitting styles for dragged/idle items
const fn = (order, down, originalIndex, dragY) => index => down && index === originalIndex
    ? {
        y: dragY,
        scale: 1.03,
        zIndex: '1',
        shadow: 7,
        position: 'fixed',
        immediate: n => ['fixed', 'y', 'zIndex'].includes(n),
    }
    : {
        y: R.compose(
            R.reduce((result, next) => result + next.height, 0),
            R.take(order.findIndex(o => o.index === index)),
        )(order),
        scale: 1,
        zIndex: '0',
        shadow: 1,
        position: 'absolute',
        immediate: false,
    };

function App() {
    const [scroll, setScroll] = useState(0);
    // const [isDragging, setIsDragging] = useState(false);
    const [, vh] = useWindowDimensions();
    const container = useRef(null);

    useInterval(() => {
        if (scroll !== 0) {
            container.current.scrollTop += scroll * 10;
        }
    }, 10);

    const order = useRef(
        data.map((d, index, arr) => ({
            index,
            height: d.height,
            yPos: R.compose(
                R.reduce((result, next) => result + next.height, 0),
                R.take(index),
            )(arr),
        })),
    ); // Store indicies as a local ref, this represents the item order
    const [springs, setSprings] = useSprings(data.length, fn(order.current)); // Create springs, each corresponds to an item, controlling its transform, scale, etc.

    const dragY = useRef(0);
    const bind = useDrag(
        ({
            // eslint-disable-next-line no-unused-vars
            args: [originalIndex], dragging, delta: [, deltaY], xy: [, vy], first, last,
        }) => {
            container.current.style.touchAction = 'none';
            // setIsDragging(dragging);
            const curIndex = order.current.findIndex(o => o.index === originalIndex);
            const curScrollTop = container.current.scrollTop;
            const itemYPos = order.current[curIndex].yPos;
            if (first) {
                dragY.current = itemYPos - curScrollTop;
            } else {
                dragY.current += deltaY;
            }
            const curYPos = curScrollTop + vy;
            const curRow = clamp(
                order.current.findIndex(o => o.yPos > (curYPos)) - 1,
                0,
                order.current.length - 1,
            );
            const newOrder = move(order.current, curIndex, curRow);
            setSprings(fn(newOrder, dragging, originalIndex, dragY.current)); // Feed springs new style data, they'll animate the view without causing a single render

            if (dragging) {
                /* #region drag scroll  */
                const boundsSize = 0.15 * vh;
                const topBounds = boundsSize;
                const bottomBounds = vh - boundsSize;
                if (vy < topBounds) {
                    setScroll((vy - topBounds) / boundsSize);
                }
                if (scroll !== 0 && vy >= topBounds && vy <= bottomBounds) {
                    setScroll(0);
                }
                if (vy > bottomBounds) {
                    setScroll((vy - bottomBounds) / boundsSize);
                }
                /* #endregion */
            } else {
                dragY.current = 0;
                order.current = newOrder;
                setScroll(0);
            }
        },
    );

    return (
        <div ref={container} className="list-container">
            {/* style={{ touchAction: isDragging ? 'none' : undefined }} */}
            <div className="list" style={{ height: order.current.reduce((result, next) => result + next.height, 0) }}>
                {springs.map(({
                    zIndex, shadow, y, scale, position,
                }, i) => (
                    <animated.div
                        {...bind(i)}
                        key={data[i].name}
                        className="card"
                        style={{
                            position,
                            zIndex,
                            boxShadow: shadow.interpolate(s => `rgba(0, 0, 0, 0.15) 0px ${s}px ${2 * s}px 0px`),
                            transform: interpolate([y, scale], (yp, s) => `translate3d(0,${yp}px,0) scale(${s})`),
                            height: data[i].height,
                            // touchAction: isDragging ? 'none' : undefined,
                        }}
                    >
                        <div className="details" />
                    </animated.div>
                ))}
            </div>
        </div>
    );
}

render(<App />, document.getElementById('root'));
