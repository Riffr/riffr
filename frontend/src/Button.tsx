import React, { Component } from 'react';

type State={};
type Props = {
    text: string,
    onClick: Function
};

class Button extends Component<Props, State> {
    render() {
        const { text, onClick } = this.props;
        return (
            <button onClick={(e) => onClick(e)}>
                {text}
            </button>
        );
    }
}

export {
    Button
};