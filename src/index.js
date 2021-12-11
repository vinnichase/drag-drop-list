/* eslint-disable react/no-array-index-key */
/* eslint-disable react/button-has-type */
import * as R from 'ramda';
import { render } from 'react-dom';
import React, { useState } from 'react';
import './styles.css';
import { DragList } from './DragList';

const ListItem = () => {
    const [content, setContent] = useState([1, 1, 1, 1, 1, 1]);
    return (
        <div style={{
            // boxShadow: 'rgba(0, 0, 0, 0.15) 0px 15px 30px 0px',
            background: '#fff',
            paddingBottom: 10,
            borderBottom: '1px solid #bbb',
            width: '100%',
        }}
        >
            <div className="drag-handle">=</div>
            <button onClick={() => setContent(R.append(1))}>+</button>
            <button onClick={() => setContent(R.dropLast(1))}>-</button>
            <div>
                {content.map(
                    (_, i) => (
                        <span key={i}>
                            Content
                            {' '}
                        </span>
                    ),
                )}
            </div>
        </div>
    );
};

const App = () => {
    const [content, setContent] = useState(R.range(0, 50));
    return (
        <>
            <div
                style={{
                    height: 800, width: 400, margin: 50, display: 'flex',
                }}
            >
                <DragList onMove={(fromIndex, toIndex) => setContent(R.move(fromIndex, toIndex))}>
                    {content.map(
                        c => <ListItem key={`key${c}`} />,
                    )}
                </DragList>
            </div>
            <button onClick={() => setContent(R.append(content.length))}>+</button>
            <button onClick={() => setContent(R.dropLast(1))}>-</button>
        </>
    );
};

render(<App />, document.getElementById('root'));
