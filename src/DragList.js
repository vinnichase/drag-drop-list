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
        zIndex,
        shadow,
    } = {},
    onDrag = (dragY = 0) => dragY,
}) => {
    const child = useMemo(() => React.Children.only(children), [children]);
    const itemNode = useRef(null);
    const item = useCallback(node => {
        if (node && node.style && node.parentNode && node.parentNode.offsetWidth) {
            itemNode.current = node;
            node.style.width = `${node.parentNode.offsetWidth}px`;
        }
    }, []);
    const _updateHeight = useCallback(({ height }) => {
        updateHeight(child.key, height);
    }, [updateHeight, child]);

    const originalY = useRef(0);
    const dragY = useRef(0);
    const deltaYCombined = useRef(0);
    const resetY = () => {
        originalY.current = 0;
        dragY.current = 0;
        deltaYCombined.current = 0;
    };
    const bindDrag = useDrag(({
        delta: [, deltaY],
        first,
        last,
    }) => {
        if (first) {
            originalY.current = y.goal;
            const { top } = itemNode.current.getBoundingClientRect();
            itemNode.current.style.position = 'fixed';
            itemNode.current.style.zIndex = '1';
            const { offsetTop } = itemNode.current;
            dragY.current = top - offsetTop;
            onDrag(dragY.current);
        } else if (last) {
            itemNode.current.style.position = 'absolute';
            onDrag(originalY.current + deltaYCombined.current);
            onDrag(0);
            resetY();
        } else {
            deltaYCombined.current += deltaY;
            dragY.current += deltaY;
            onDrag(dragY.current);
        }
    });
    return (
        <ResizeObserver onResize={_updateHeight}>
            <animated.div
                // eslint-disable-next-line react/jsx-props-no-spreading
                {...bindDrag()}
                style={{
                    flex: 1,
                    position: 'absolute',
                    zIndex: zIndex || '0',
                    display: 'flex',
                    boxShadow: shadow.to(
                        s => `rgba(0, 0, 0, 0.15) 0px ${s}px ${2 * s}px 0px`,
                    ),
                    transform: to(
                        [y],
                        yp => `translateY(${yp}px)`,
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
        zIndex: '0',
        shadow: 0,
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
        springs,
        setSprings: fnSprings => springsApi.start(fnSprings),
        updateHeight,
        getItemYPos: index => R.pathOr(0, [index, 'yPos'], heightsArr.current),
    };
};

export const DragList = ({ children }) => {
    console.log('render');
    const container = useRef(null);
    const list = useRef(null);
    const setListHeight = useCallback(height => {
        if (list.current) list.current.style.height = `${height}px`;
    }, []);
    const {
        springs,
        setSprings,
        updateHeight,
        getItemYPos,
    } = useChildrenHeights(children, setListHeight);

    const createFnSprings = (dragY = 0, dragIndex = false) => index => dragY
        && index === dragIndex
        ? {
            y: dragY,
            shadow: 15,
            zIndex: '1',
            immediate: n => ['fixed', 'y', 'zIndex'].includes(n),
        }
        : {
            y: getItemYPos(index),
            shadow: 0,
            zIndex: '0',
        };

    return (
        <div
            ref={container}
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
                    zIndex,
                    shadow,
                }, i) => (
                    <DragItem
                        key={children[i].key}
                        deps={{
                            key: children[i].key,
                        }}
                        updateHeight={updateHeight}
                        springProps={{
                            y,
                            zIndex,
                            shadow,
                        }}
                        onDrag={dragY => setSprings(createFnSprings(dragY, i))}
                    >
                        {children[i]}
                    </DragItem>
                ))}
            </div>
        </div>
    );
};
