import React from 'react';

interface CanvasProps {
    id: string;
    width: number;
    height: number;
}

class Canvas extends React.Component<CanvasProps> {
    private x: number;
    private ctx: any;
    private c: any;
    private xVelocity: number;
    private aspectRatio: number;

    constructor(props: CanvasProps) {
        super(props);
        this.x = 0;
        this.xVelocity = 10;
        this.aspectRatio = 12.5/17;
    }

    componentDidMount() {
        this.c = document.getElementById("canvas");
        this.ctx = this.c.getContext("2d");

        setInterval(() => (this.updateCanvas()), 20);
        this.updateCanvas();
    }

    componentDidUpdate() {
        this.updateCanvas();
    }

    updateCanvas() {
        this.ctx.clearRect(0, 0, this.props.width, this.props.height);
        this.ctx.fillStyle = "blue";
        if (this.x + 300 > this.props.width || this.x < 0) {
            this.xVelocity *= -1;
        }
        this.x += this.xVelocity;
        this.ctx.fillRect(this.x, 40, 300, 300 * this.aspectRatio);
    }

    render() {
        return (
            <canvas ref="canvas" id={this.props.id} width={this.props.width} height={this.props.height} />
        );
    }
}

export default Canvas;