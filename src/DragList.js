/* eslint-disable react/no-array-index-key */
/* eslint-disable no-param-reassign */
import * as R from 'ramda';
import React, {
    useCallback, useEffect, useMemo, useRef,
} from 'react';
import ResizeObserver from 'rc-resize-observer';
import './styles.css';
import { useSprings, animated, to } from 'react-spring';

const reduceIndexed = R.addIndex(R.reduce);

const DragItem = ({
    children,
    updateHeight,
    springProps: { y } = {},
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
                {child}
            </animated.div>
        </ResizeObserver>
    );
};

export const useChildrenHeights = (children, onHeightChange) => {
    const heightsMap = useRef({});
    const heightsArr = useRef([]);
    const heightSum = useRef(0);

    const fnSprings = index => ({
        y: R.pathOr(heightSum.current, [index, 'yPos'])(heightsArr.current),
    });

    const composeHeights = useCallback(_children => {
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
        }, 0)(_children);
        onHeightChange && onHeightChange(heightSum.current);
    }, [onHeightChange]);

    const [springs, setSprings] = useSprings(React.Children.count(children), fnSprings);
    useEffect(() => {
        composeHeights(children);
        setSprings(fnSprings);
    }, [composeHeights, setSprings, children]);

    const updateHeight = useCallback((key, height) => {
        heightsMap.current = R.assoc(key, { height }, heightsMap.current);
        composeHeights(children);
        setSprings(fnSprings);
    }, [composeHeights, setSprings, children]);

    return {
        springs,
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
        springs,
        updateHeight,
    } = useChildrenHeights(children, setListHeight);

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
                {springs.map(({ y }, i) => (
                    <DragItem
                        key={children[i].key}
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
