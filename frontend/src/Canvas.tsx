import React from 'react';

interface CanvasProps {
    id: string;
    width: number;
    height: number;
}

abstract class CanvasObject {
    x: number;
    y: number;

    protected constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    abstract draw(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void;

    abstract update(): boolean;
}

class CanvasGrid extends CanvasObject {
    vertical: number;
    horizontal: number;
    color: string;
    thickness: number;
    private theta: number;

    constructor(x: number, y: number, vertical: number, horizontal: number, color: string, thickness: number) {
        super(x, y);
        this.vertical = vertical;
        this.horizontal = horizontal;
        this.color = color;
        this.thickness = thickness;
        this.theta = 0;
    }

    draw(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
        ctx.beginPath();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.thickness;
        for (let i = 0; i < this.vertical; i++) {
            ctx.moveTo(-this.thickness, (i / this.vertical) * canvasHeight);
            ctx.lineTo(canvasWidth, (i / this.vertical) * canvasHeight);
        }
        for (let j = 0; j < this.horizontal; j++) {
            ctx.moveTo((j / this.horizontal) * canvasWidth, 0);
            ctx.lineTo((j / this.horizontal) * canvasWidth, canvasHeight);
        }
        ctx.stroke();
    }

    update(): boolean {
        return false;
    }

}

class ScanLine extends CanvasObject {
    private velocity: number;
    private range: number;
    private color: string;
    private thickness: number;

    constructor(x: number, y: number, velocity: number, range: number, color: string, thickness: number) {
        super(x, y);
        this.velocity = velocity;
        this.range = range;
        this.color = color;
        this.thickness = thickness;
    }


    draw(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.thickness;
        ctx.beginPath();
        ctx.moveTo(this.x, 0);
        ctx.lineTo(this.x, canvasHeight);
        ctx.stroke();
    }

    update(): boolean {
        this.x += this.velocity;
        if (this.x > this.range) {
            this.x = 0;
        }
        return false;
    }

}

class Canvas extends React.Component<CanvasProps> {
    private ctx: any;
    private c: any;
    private aspectRatio: number;
    private canvasObjects: Array<CanvasObject>;

    constructor(props: CanvasProps) {
        super(props);
        /* Todo: set this properly */
        this.aspectRatio = 12.5 / 17;

        let grid: CanvasGrid = new CanvasGrid(0, 0, 8, 10, "#222", 4);
        let line: ScanLine = new ScanLine(0, 0, 8, this.props.width, "#00ff00", 4);
        this.canvasObjects = [grid, line];
    }

    componentDidMount() {
        this.c = document.getElementById("canvas");
        this.ctx = this.c.getContext("2d");

        setInterval(() => (this.updateObjects()), 20);
        setInterval(() => (this.drawObjects()), 20);
        this.updateObjects();
    }

    componentDidUpdate() {
        this.updateObjects();
    }

    updateObjects() {
        for (let obj of this.canvasObjects) {
            obj.update();
        }
    }

    drawObjects() {
        this.ctx.clearRect(0, 0, this.props.width, this.props.height);
        for (let obj of this.canvasObjects) {
            obj.draw(this.ctx, this.props.width, this.props.height);
        }
    }

    render() {
        return (
            <canvas ref="canvas" id={this.props.id} width={this.props.width} height={this.props.height}/>
        );
    }
}

export default Canvas;