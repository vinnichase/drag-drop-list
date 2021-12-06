/* eslint-disable no-param-reassign */
import * as R from 'ramda';
import React, { useCallback, useRef } from 'react';
import ResizeObserver from 'rc-resize-observer';
import './styles.css';

const DragItem = ({
    children,
    index,
    updateHeight,
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
        <div
            style={{
                position: 'absolute',
                display: 'flex',
                flex: 1,
            }}
            ref={item}
        >
            <ResizeObserver onResize={_updateHeight}>
                {children}
            </ResizeObserver>
        </div>
    );
};

export const DragList = ({ children }) => {
    console.log('render');
    const container = useRef(null);
    const order = useRef([]);
    const updateHeight = useCallback((height, index) => {
        order.current = R.assocPath([index], height, order.current);
        console.log(order.current);
    }, []);

    return (
        <div
            ref={container}
            className="list-container"
        >
            <div
                className="list"
                style={{
                    display: 'flex',
                    flex: 1,
                }}
            >
                {React.Children.map(children, (child, i) => (
                    <DragItem
                        index={i}
                        updateHeight={updateHeight}
                    >
                        {child}
                    </DragItem>
                ))}
            </div>
        </div>
    );
};
