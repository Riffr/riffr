import React from 'react';
import {Link, } from "react-router-dom";

const ErrorMessage = () => {
    return (
        <div id="error-div">
            <p style={{marginBottom: 0}}>Something went wrong...</p>
            <p>Click the button to go home.</p>
            <Link to={"/"} >
                <button className={"squircle-button white-text dark-burgandy"} >
                    <i className={"fa fa-home"} />
                </button>
            </Link>
        </div>
    )
}

export default ErrorMessage;
