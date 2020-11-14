/* eslint-disable no-multi-assign */
/* eslint-disable react/jsx-props-no-spreading */
import * as R from 'ramda';
import { render } from 'react-dom';
import React, { useState, useRef } from 'react';
import { animated, useSprings, interpolate } from 'react-spring';
import { useDrag } from 'react-use-gesture';
import data from './data';
import './styles.css';
import useWindowDimensions from './useWindowDimensions';
import useInterval from './useInterval';

const getNextIndex = (orderArr, index, yPos) => {
    const isYPosAfterItem = item => item.yPos + (item.height / 2) < yPos;
    if (yPos > orderArr[index].yPos) {
        return R.compose(
            R.clamp(0, orderArr.length - 1),
            R.add(index),
            R.length,
            R.tap(console.log),
            R.takeWhile(isYPosAfterItem),
            R.drop(index),
        )(orderArr);
    }
    return R.compose(
        R.clamp(0, orderArr.length - 1),
        R.subtract(index),
        R.length,
        R.takeLastWhile(R.complement(isYPosAfterItem)),
        R.take(index),
    )(orderArr);
};

const createOrder = keyProp => R.compose(
    R.nth(1),
    R.addIndex(R.mapAccum)((yPos, item, index) => [yPos + item.height, {
        index,
        key: R.prop(keyProp, item),
        height: item.height,
        yPos,
    }], 0),
);

const updateOrder = R.compose(
    R.nth(1),
    R.mapAccum((yPos, item) => [yPos + item.height, {
        ...item,
        yPos,
    }], 0),
);

const fn = (order, dragging, draggingIndex, dragY, immediate = false) => index => dragging && index === draggingIndex
    ? {
        y: dragY,
        scale: 1.1,
        zIndex: '1',
        shadow: 15,
        position: 'fixed',
        immediate: n => ['fixed', 'y', 'zIndex'].includes(n),
    }
    : {
        y:
            immediate && index === draggingIndex
                ? dragY
                : order[index].yPos,
        scale: 1,
        zIndex: '0',
        shadow: 1,
        position: 'absolute',
        immediate: n => immediate && n === 'y',
    };

function App() {
    const [order, setOrder] = useState(createOrder('name')(data));
    const [springs, setSprings] = useSprings(order.length, fn(order));

    const [, vh] = useWindowDimensions();
    const container = useRef(null);

    const [isDragging, setIsDragging] = useState(false);
    const scroll = useRef(0);

    useInterval(() => {
        if (scroll.current !== 0) {
            const scrollStep = scroll.current * 10;
            container.current.scrollTop += scrollStep;
        }
    }, 10);

    const dragY = useRef(0);
    const bind = useDrag(
        ({
            // eslint-disable-next-line no-unused-vars
            args: [draggingIndex],
            dragging,
            delta: [, deltaY],
            xy: [, vy],
            first,
        }) => {
            container.current.style.touchAction = 'none';
            setIsDragging(dragging);
            const curScrollTop = container.current.scrollTop;
            const itemYPos = order[draggingIndex].yPos;
            if (first) {
                dragY.current = itemYPos - curScrollTop;
            } else {
                dragY.current += deltaY;
            }
            const curYPos = curScrollTop + dragY.current;
            const newOrder = R.move(
                draggingIndex,
                getNextIndex(order, draggingIndex, curYPos),
            )(order);
            if (!dragging) {
                setSprings(fn(newOrder, dragging, draggingIndex, curYPos, true));
            }
            setSprings(fn(newOrder, dragging, draggingIndex, dragY.current));

            if (dragging) {
                /* #region drag scroll  */
                const boundsSize = 0.15 * vh;
                const topBounds = boundsSize;
                const bottomBounds = vh - boundsSize;
                if (vy < topBounds) {
                    scroll.current = (vy - topBounds) / boundsSize;
                }
                if (scroll !== 0 && vy >= topBounds && vy <= bottomBounds) {
                    scroll.current = 0;
                }
                if (vy > bottomBounds) {
                    scroll.current = (vy - bottomBounds) / boundsSize;
                }
                /* #endregion */
            } else {
                setOrder(R.compose(
                    updateOrder,
                    R.move(
                        draggingIndex,
                        getNextIndex(order, draggingIndex, curYPos),
                    ),
                ));
                dragY.current = 0;
                scroll.current = 0;
            }
        },
    );

    return (
        <div
            ref={container}
            className="list-container"
            style={{ touchAction: isDragging ? 'none' : undefined }}
        >
            <div
                className="list"
                style={{
                    height: order.reduce(
                        (result, next) => result + next.height,
                        0,
                    ),
                }}
            >
                {order.map((o, i) => (
                    <animated.div
                        {...bind(i)}
                        key={o.index}
                        className="card"
                        style={{
                            position: springs[i].position,
                            zIndex: springs[i].zIndex,
                            boxShadow: springs[i].shadow.interpolate(
                                s => `rgba(0, 0, 0, 0.15) 0px ${s}px ${2 * s}px 0px`,
                            ),
                            transform: interpolate(
                                [springs[i].y, springs[i].scale],
                                (yp, s) => `translate3d(0,${yp}px,0) scale(${s})`,
                            ),
                            height: o.height,
                            touchAction: isDragging ? 'none' : undefined,
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
