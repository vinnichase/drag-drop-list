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
import useInterval from './useInterval';

const reduceIndexed = R.addIndex(R.reduce);
const depDeepEquals = (prevProps, nextProps) => prevProps.deps && nextProps.deps
    ? R.equals(prevProps.deps, nextProps.deps)
    : false;
export const isBetween = R.curry((left, right, val) => left < val && val < right);
export const isBetweenIncl = R.curry((left, right, val) => left <= val && val <= right);
export const isBetweenInclLeft = R.curry((left, right, val) => left <= val && val < right);
export const isBetweenInclRight = R.curry((left, right, val) => left < val && val <= right);
const findDragIndex = (dragY, list) => {
    const dragIndex = list.findIndex(o => o.yPos + o.height / 2 >= dragY);
    return dragIndex > -1 ? dragIndex : list.length - 1;
};

const useChildrenHeights = (children, onHeightChange) => {
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

    const heightOffset = useRef(0);
    const currentIndex = useRef(0);
    const newIndex = useRef(0);
    const newYPos = useRef(0);

    const getItemYPos = index => {
        const yPos = R.pathOr(0, [index, 'yPos'], heightsArr.current);
        if (index === currentIndex.current) {
            return newYPos.current;
        }
        const fromIndex = R.min(currentIndex.current, newIndex.current);
        const toIndex = R.max(currentIndex.current, newIndex.current);
        if (heightOffset.current !== 0 && isBetweenIncl(fromIndex, toIndex)(index)) {
            return yPos + heightOffset.current;
        }
        return yPos;
    };
    return {
        springs,
        setSprings: fnSprings => springsApi.start(fnSprings),
        updateHeight,
        getItemYPos,
        setDragDistance: (dragY, _currentIndex) => {
            const _newIndex = findDragIndex(dragY, heightsArr.current);
            const { yPos: yPosCurrentIndex, height: heightCurrentIndex } = R.path([_currentIndex], heightsArr.current);
            const { yPos: yPosNewIndex, height: heightNewIndex } = R.path([_newIndex], heightsArr.current);

            newIndex.current = _newIndex;
            currentIndex.current = _currentIndex;

            if (_currentIndex < _newIndex) {
                // MOVE DOWN
                heightOffset.current = -heightCurrentIndex;
                newYPos.current = yPosNewIndex + heightNewIndex - heightCurrentIndex;
            } else if (_currentIndex > _newIndex) {
                // MOVE UP
                heightOffset.current = heightCurrentIndex;
                newYPos.current = yPosNewIndex;
            } else {
                // STAY
                heightOffset.current = 0;
                newYPos.current = yPosCurrentIndex;
            }
        },
    };
};

const useItemDrag = ({
    itemNode,
    getOriginalY = () => 0,
    onDrag = ({ absoluteY = 0, relativeY = 0 }) => ({ absoluteY, relativeY }),
    onDragEnd = ({ absoluteY = 0, relativeY = 0 }) => ({ absoluteY, relativeY }),
}) => {
    const originalY = useRef(0);
    const dragY = useRef(0);
    const deltaYCombined = useRef(0);
    const resetY = () => {
        originalY.current = 0;
        dragY.current = 0;
        deltaYCombined.current = 0;
    };
    const dragEvent = () => ({
        absoluteY: dragY.current,
        relativeY: originalY.current + deltaYCombined.current,
    });
    const bindDrag = useDrag(({
        delta: [, deltaY],
        first,
        last,
    }) => {
        if (first) {
            originalY.current = getOriginalY();
            const { top } = itemNode.current.getBoundingClientRect();
            itemNode.current.style.position = 'fixed';
            itemNode.current.style.zIndex = '1';
            const { offsetTop } = itemNode.current;
            dragY.current = top - offsetTop;
            onDrag(dragEvent());
        } else if (last) {
            itemNode.current.style.position = 'absolute';
            onDragEnd(dragEvent());
            resetY();
        } else {
            deltaYCombined.current += deltaY;
            dragY.current += deltaY;
            onDrag(dragEvent());
        }
    });

    return {
        bindDrag: bindDrag(),
    };
};

const useScrollDrag = containerRef => {
    const scroll = useRef(0);
    const scrollDrag = useRef(0);
    useInterval(() => {
        if (scroll.current !== 0) {
            const scrollStep = scroll.current * 10;
            const scrollTopBefore = containerRef.current.scrollTop;
            containerRef.current.scrollTop += scrollStep;
            const scrollTopAfter = containerRef.current.scrollTop;
            scrollDrag.current += scrollTopBefore - scrollTopAfter;
        }
    }, 10);
    const bindDrag = useDrag(({
        xy: [, y],
        last,
    }) => {
        const { top, height } = containerRef.current.getBoundingClientRect();
        const yContainer = y - top;
        const boundsSize = 0.15 * height;
        const topBounds = boundsSize;
        const bottomBounds = height - boundsSize;
        if (yContainer < topBounds) {
            scroll.current = (yContainer - topBounds) / boundsSize;
        }
        if (scroll.current !== 0 && yContainer >= topBounds && yContainer <= bottomBounds) {
            scroll.current = 0;
        }
        if (yContainer > bottomBounds) {
            scroll.current = (yContainer - bottomBounds) / boundsSize;
        }
        if (last) {
            scroll.current = 0;
            scrollDrag.current = 0;
        }
    });
    return {
        bindDrag: bindDrag(),
        scrollDrag,
    };
};

const _DragItem = ({
    children,
    updateHeight,
    springProps: {
        y,
        zIndex,
        shadow,
    } = {},
    onDrag = ({ absoluteY = 0, relativeY = 0 }) => ({ absoluteY, relativeY }),
    onDragEnd = ({ absoluteY = 0, relativeY = 0 }) => ({ absoluteY, relativeY }),
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

    const {
        bindDrag,
    } = useItemDrag({
        itemNode,
        getOriginalY: () => y.goal,
        onDrag,
        onDragEnd,
    });

    return (
        <ResizeObserver onResize={_updateHeight}>
            <animated.div
                // eslint-disable-next-line react/jsx-props-no-spreading
                {...bindDrag}
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

export const DragList = ({ children }) => {
    console.log('render');
    const container = useRef(null);
    const list = useRef(null);
    const setListHeight = useCallback(height => {
        if (list.current) list.current.style.height = `${height}px`;
    }, []);
    const {
        setDragDistance,
        springs,
        setSprings,
        updateHeight,
        getItemYPos,
    } = useChildrenHeights(children, setListHeight);

    const {
        bindDrag,
        scrollDrag,
    } = useScrollDrag(container);

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
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...bindDrag}
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
                        onDrag={async ({ absoluteY, relativeY }) => {
                            setDragDistance(relativeY - scrollDrag.current, i);
                            setSprings(createFnSprings(absoluteY, i));
                        }}
                        onDragEnd={({ relativeY }) => {
                            setSprings(createFnSprings(relativeY - scrollDrag.current, i));
                            setSprings(createFnSprings(0, i));
                        }}
                    >
                        {children[i]}
                    </DragItem>
                ))}
            </div>
        </div>
    );
};
