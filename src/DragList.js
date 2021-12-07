/* eslint-disable react/no-array-index-key */
/* eslint-disable no-param-reassign */
import * as R from 'ramda';
import React, {
    memo, useCallback, useEffect, useMemo, useRef,
} from 'react';
import ResizeObserver from 'rc-resize-observer';
import './styles.css';
import { useSprings, animated, to } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';

const reduceIndexed = R.addIndex(R.reduce);
const depDeepEquals = (prevProps, nextProps) => prevProps.deps && nextProps.deps
    ? R.equals(prevProps.deps, nextProps.deps)
    : false;

const _DragItem = ({
    children,
    updateHeight,
    springProps: {
        y,
        position,
        zIndex,
    } = {},
    dragProps = {},
}) => {
    const child = useMemo(() => React.Children.only(children), [children]);
    const item = useCallback(node => {
        if (node && node.style && node.parentNode && node.parentNode.offsetWidth) {
            node.style.width = `${node.parentNode.offsetWidth}px`;
        }
    }, []);
    const _updateHeight = useCallback(({ height }) => {
        updateHeight(child.key, height);
    }, [updateHeight, child]);
    return (
        <ResizeObserver onResize={_updateHeight}>
            <animated.div
                // eslint-disable-next-line react/jsx-props-no-spreading
                {...dragProps}
                style={{
                    position: position || 'absolute',
                    zIndex: zIndex || '0',
                    display: 'flex',
                    flex: 1,
                    transform: to(
                        [y],
                        yp => `translate3d(0,${yp}px,0)`,
                    ),
                }}
                ref={item}
            >
                {child}
            </animated.div>
        </ResizeObserver>
    );
};
const DragItem = memo(_DragItem, depDeepEquals);

export const useChildrenHeights = (children, onHeightChange) => {
    const heightsMap = useRef({});
    const heightsArr = useRef([]);
    const heightSum = useRef(0);
    const _children = useRef([]);

    const _fnSprings = index => ({
        y: R.pathOr(heightSum.current, [index, 'yPos'])(heightsArr.current),
        position: 'absolute',
        zIndex: '0',
    });

    const composeHeights = useCallback(() => {
        heightsArr.current = [];
        heightSum.current = reduceIndexed((yPos, child, index) => {
            const heightObj = R.compose(
                R.assoc('index', index),
                R.assoc('yPos', yPos),
                R.propOr({ height: 0 }, child.key),
            )(heightsMap.current);
            heightsMap.current = R.assoc(child.key, heightObj, heightsMap.current);
            heightsArr.current = R.assocPath([index], heightObj, heightsArr.current);
            return yPos + heightObj.height;
        }, 0)(_children.current);
        onHeightChange && onHeightChange(heightSum.current);
    }, [onHeightChange]);

    const [springs, springsApi] = useSprings(React.Children.count(children), _fnSprings);
    useEffect(() => {
        _children.current = children;
        composeHeights();
        springsApi.start(_fnSprings);
    }, [composeHeights, springsApi, children]);

    const updateHeight = useCallback((key, height) => {
        heightsMap.current = R.assoc(key, { height }, heightsMap.current);
        composeHeights();
        springsApi.start(_fnSprings);
    }, [composeHeights, springsApi]);

    return {
        heightsArr,
        springs,
        setSprings: fnSprings => springsApi.start(index => ({
            ..._fnSprings(index),
            ...fnSprings(index),
        })),
        updateHeight,
    };
};

export const DragList = ({ children }) => {
    console.log('render');
    const list = useRef(null);
    const setListHeight = useCallback(height => {
        if (list.current) list.current.style.height = `${height}px`;
    }, []);
    const {
        heightsArr,
        springs,
        setSprings,
        updateHeight,
    } = useChildrenHeights(children, setListHeight);

    const createFnSprings = (dragIndex = false, dragY = 0) => index => index === dragIndex
        ? {
            y: dragY,
            position: 'fixed',
            zIndex: '1',
            immediate: n => ['fixed', 'y', 'zIndex'].includes(n),
        }
        : {
            y: R.pathOr(0, [index, 'yPos'], heightsArr.current),
            // position: 'absolute',
            // zIndex: '0',
        };

    const bindDrag = useDrag(({
        args: [dragIndex],
        dragging,
        // delta: [, deltaY],
        xy: [, vy],
        // first,
    }) => {
        // console.log(dragIndex);
        // console.log(deltaY);
        // console.log(vy);
        if (dragging) {
            setSprings(createFnSprings(dragIndex, vy));
        }
    });

    return (
        <div
            style={{
                margin: 0,
                display: 'flex',
                flex: 1,
                overflowY: 'scroll',
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
                }}
            >
                {springs.map(({
                    y,
                    position,
                    zIndex,
                }, i) => (
                    <DragItem
                        key={children[i].key}
                        deps={{
                            key: children[i].key,
                            position,
                            zIndex,
                        }}
                        updateHeight={updateHeight}
                        springProps={{
                            y,
                            position,
                            zIndex,
                        }}
                        dragProps={bindDrag(i)}
                    >
                        {children[i]}
                    </DragItem>
                ))}
            </div>
        </div>
    );
};
