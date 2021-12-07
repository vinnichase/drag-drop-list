/* eslint-disable no-multi-assign */
/* eslint-disable react/jsx-props-no-spreading */
import * as R from 'ramda';
import React, { useState, useRef } from 'react';
import { animated, useSprings, to } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import clamp from 'lodash-es/clamp';
import move from 'lodash-move';
import data from './data';
import './styles.css';
import useWindowDimensions from './useWindowDimensions';
import useInterval from './useInterval';

const createOrder = R.compose(
    R.nth(1),
    R.addIndex(R.mapAccum)((yPos, item, index) => [yPos + item.height, {
        index,
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

// Returns fitting styles for dragged/idle items
const fn = (order, dragging, originalIndex, dragY, immediate = false) => index => dragging && index === originalIndex
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
          immediate && index === originalIndex
              ? dragY
              : R.compose(
                  R.reduce((result, next) => result + next.height, 0),
                  R.take(order.findIndex(o => o.index === index)),
              )(order),
        scale: 1,
        zIndex: '0',
        shadow: 1,
        position: 'absolute',
        immediate: n => immediate && n === 'y',
    };

export const DragList = () => {
    const [isDragging, setIsDragging] = useState(false);
    const [, vh] = useWindowDimensions();
    const scroll = useRef(0);
    const container = useRef(null);

    console.log('RERENDER');

    useInterval(() => {
        if (scroll.current !== 0) {
            const scrollStep = scroll.current * 10;
            container.current.scrollTop += scrollStep;
        }
    }, 10);

    const order = useRef(
        createOrder(data),
    ); // Store indicies as a local ref, this represents the item order
    const [springs, setSprings] = useSprings(data.length, fn(order.current)); // Create springs, each corresponds to an item, controlling its transform, scale, etc.

    const dragY = useRef(0);
    const bind = useDrag(
        ({
            // eslint-disable-next-line no-unused-vars
            args: [originalIndex],
            dragging,
            delta: [, deltaY],
            xy: [, vy],
            first,
        }) => {
            container.current.style.touchAction = 'none';
            setIsDragging(dragging);
            const curIndex = order.current.findIndex(
                o => o.index === originalIndex,
            );
            const curScrollTop = container.current.scrollTop;
            const itemYPos = order.current[curIndex].yPos;
            if (first) {
                dragY.current = itemYPos - curScrollTop;
            } else {
                dragY.current += deltaY;
            }
            const curYPos = curScrollTop + dragY.current;
            const newIndex = order.current.findIndex(
                o => o.yPos + o.height / 2 > curYPos,
            );
            const curRow = clamp(
                newIndex >= 0 ? newIndex : order.current.length,
                0,
                order.current.length - 1,
            );
            const newOrder = move(order.current, curIndex, curRow);
            if (!dragging) {
                setSprings(fn(newOrder, dragging, originalIndex, curYPos, true));
            }
            setSprings(fn(newOrder, dragging, originalIndex, dragY.current)); // Feed springs new style data, they'll animate the view without causing a single render

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
                dragY.current = 0;
                order.current = updateOrder(newOrder);
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
                    height: order.current.reduce(
                        (result, next) => result + next.height,
                        0,
                    ),
                }}
            >
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
                            boxShadow: shadow.to(
                                s => `rgba(0, 0, 0, 0.15) 0px ${s}px ${2 * s}px 0px`,
                            ),
                            transform: to(
                                [y, scale],
                                (yp, s) => `translate3d(0,${yp}px,0) scale(${s})`,
                            ),
                            height: data[i].height,
                            touchAction: isDragging ? 'none' : undefined,
                        }}
                    >
                        <div className="details" />
                    </animated.div>
                ))}
            </div>
        </div>
    );
};
