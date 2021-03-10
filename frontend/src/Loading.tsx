import React from 'react';

const Loading = () => {
    return (
        <div id="loading-div">
            <h2>Please wait...</h2>
            <div className="lds-ripple">
                <div></div>
                <div></div>
            </div>
        </div>
    )
}

export default Loading;
