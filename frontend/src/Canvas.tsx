import React, {useEffect} from 'react';

interface CanvasProps {
    id: string;
    width: number;
    height: number;
    time: number;
    // deltaTime: number;
    loopLength: number;
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

    constructor(x: number, y: number, vertical: number, horizontal: number, color: string, thickness: number) {
        super(x, y);
        this.vertical = vertical;
        this.horizontal = horizontal;
        this.color = color;
        this.thickness = thickness;
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

    setX(x: number) : void {
        this.x = x;
    }

    setVelocity(velocity: number) : void {
        this.velocity = velocity;
    }

    update(): boolean {
        this.x += this.velocity;
        if (this.x > this.range) {
            this.x = 0;
        }
        return false;
    }

}

class CanvasText extends CanvasObject {
    private text: string;
    private font: string;
    private color: string;
    private counter: number;

    constructor(x: number, y: number, text: string, fontSize: number, color: string) {
        super(x, y);
        this.text = text;
        this.font = `${fontSize}px Arial`;
        this.color = color;
        this.counter = 0;
    }

    draw(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
        ctx.font = this.font;
        ctx.fillStyle = this.color;
        ctx.fillText(this.text, this.x, this.y)
    }

    update(): boolean {
        this.counter += 1;
        return this.counter > 100;
        // return false;
    }


}

const Canvas = (props: CanvasProps) => {
    let aspectRatio = 12.5 / 17;

    let grid: CanvasGrid = new CanvasGrid(0, 0, 8, 10, "#222", 4);
    // let text: CanvasText = new CanvasText(100, 100, "Hello World", 30, "red");
    let canvasObjects = [grid]; //, text];

    const canvasRef = React.useRef(null)

    //Initial draw
    useEffect(() => {
        // @ts-ignore
        let ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, props.width, props.height);
        for (let obj of canvasObjects) {
            obj.draw(ctx, props.width, props.height);
        }

    }, [])

    //Redraw with scanline
    useEffect(() => {
        // @ts-ignore
        let ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, props.width, props.height);
        let line: ScanLine = new ScanLine((props.time*props.width/props.loopLength)%props.width, 0, 0, props.width, "#00ff00", 4);
        for (let obj of [...canvasObjects, line]) {
            obj.draw(ctx, props.width, props.height);
        }
        // console.log(props.time);
    }, [props.time])

    return (
        <canvas ref={canvasRef} id={props.id} width={props.width} height={props.height}/>
    );

}


export default Canvas;