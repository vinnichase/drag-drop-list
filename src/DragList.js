/* eslint-disable react/no-array-index-key */
/* eslint-disable no-param-reassign */
import * as R from 'ramda';
import React, {
    useCallback, useEffect, useRef,
} from 'react';
import ResizeObserver from 'rc-resize-observer';
import './styles.css';
import { useSprings, animated, to } from 'react-spring';

const sum = R.reduce(R.add, 0);
const sumTo = toIndex => R.compose(
    sum,
    R.take(toIndex),
);

const DragItem = ({
    children,
    index,
    updateHeight,
    springProps: { y } = {},
}) => {
    const item = useCallback(node => {
        if (node && node.style && node.parentNode && node.parentNode.offsetWidth) {
            node.style.width = `${node.parentNode.offsetWidth}px`;
        }
    }, []);
    const _updateHeight = useCallback(({ height }) => {
        updateHeight(height, index);
    }, [updateHeight, index]);

    return (
        <animated.div
            style={{
                position: 'absolute',
                display: 'flex',
                flex: 1,
                transform: to(
                    [y],
                    yp => `translate3d(0,${yp}px,0)`,
                ),
            }}
            ref={item}
        >
            <ResizeObserver onResize={_updateHeight}>
                {children}
            </ResizeObserver>
        </animated.div>
    );
};

export const DragList = ({ children }) => {
    console.log('render');
    const container = useRef(null);
    const list = useRef(null);
    const heights = useRef([]);
    const heightSum = useRef(null);
    const fnSprings = index => ({
        y: sumTo(index)(heights.current),
    });
    const setListHeight = () => {
        if (list.current) {
            list.current.style.height = `${heightSum.current}px`;
        }
    };
    const [springs, setSprings] = useSprings(React.Children.count(children), fnSprings);
    useEffect(() => {
        heights.current = R.take(React.Children.count(children), heights.current);
        heightSum.current = sum(heights.current);
        setSprings(fnSprings);
        setListHeight();
    }, [setSprings, children]);

    const updateHeight = useCallback((height, index) => {
        heights.current = R.assocPath([index], height, heights.current);
        heightSum.current = sum(heights.current);
        setSprings(fnSprings);
        setListHeight();
    }, [setSprings]);

    return (
        <div
            ref={container}
            style={{
                margin: 0,
                display: 'flex',
                flex: 1,
                overflowY: 'scroll',
                // userSelect: 'none',
                // WebkitUserSelect: 'none',
            }}
        >
            <div
                ref={list}
                style={{
                    position: 'relative',
                    margin: 0,
                    display: 'flex',
                    flex: 1,
                    overflowX: 'hidden',
                    // userSelect: 'none',
                    // WebkitUserSelect: 'none',
                    // height: 1000,
                }}
            >
                {springs.map(({ y }, i) => (
                    <DragItem
                        key={i}
                        index={i}
                        updateHeight={updateHeight}
                        springProps={{ y }}
                    >
                        {children[i]}
                    </DragItem>
                ))}
            </div>
        </div>
    );
};
