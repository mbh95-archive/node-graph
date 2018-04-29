import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import {Const, Abs, Plus, Mult, Cos, RectToPolar} from './Functions.js'

class App extends Component {
  constructor() {
    super();
    this.state = {
      w: 100,
      h: 100,
      time: 0.0,
      finalOut: {
        r: "grayOut",
        g: "grayOut",
        b: "grayOut"
      },
      funcs: [
        new Cos("scaledR", "grayOut"),
        new Const(6.28, "2pi"),
        new Mult("r", "2pi", "scaledR"),
        new RectToPolar("x", "y", "r", "theta")
      ],
      funcFromOutId: {},
    };
    this.canvas = React.createRef();

    // Generate the dependency map
    // Map output ids to list of dependency input ids
    let funcFromOutId = {}
    const funcs = this.state.funcs;
    for (let i = 0; i < funcs.length; i++) {
      const func = funcs[i];
      for (let outName in func.outputIds) {
        const outId = func.outputIds[outName];
        funcFromOutId[outId] = func;
      }
    }
    this.state.funcFromOutId = funcFromOutId;
    // console.log(funcFromOutId);
    this.runGraph(-2,-8,3);
  }

  screenToWorldX(x) {
    const screenWidth = this.canvas.current.width;
    return 2 * (x / screenWidth) - 1;
  }

  screenToWorldY(y) {
    const screenHeight = this.canvas.current.height;
    return 2 * (y / screenHeight) - 1;
  }

  colorRangeToByte(channel) {
    return Math.floor(channel*255);
  }

  draw(t) {
    const canvas = this.canvas.current;
    const imageData = this.ctx.createImageData(canvas.width, canvas.height);

    for (let y = 0; y < canvas.height; y++) {
      const worldY = this.screenToWorldY(y);
      const yByteOffset = 4*y * canvas.width;
      for (let x = 0; x < canvas.height; x++) {
        const worldX = this.screenToWorldX(x);
        let {r, g, b} = this.runGraph(worldX, worldY, t);
        const byteOffset = yByteOffset + (x * 4);
        imageData.data[byteOffset + 0] = this.colorRangeToByte(r);
        imageData.data[byteOffset + 1] = this.colorRangeToByte(g);
        imageData.data[byteOffset + 2] = this.colorRangeToByte(b);
        imageData.data[byteOffset + 3] = 255;
      }
    }
    this.ctx.putImageData(imageData, 0, 0);
  }

  runGraph(x, y, t) {
    const funcs = this.state.funcs;
    let stack = [];
    let cache = {
      x: x,
      y: y,
      t: t
    };

    //Generate the initial stack
    for (let finalOutName in this.state.finalOut) {
      const finalOutValueId = this.state.finalOut[finalOutName];
      stack.push(finalOutValueId);
    }
    // console.log(stack);

    while(stack.length > 0) {
      const topId = stack[stack.length - 1];
      // console.log(topId);
      // console.log(stack);
      // console.log(cache);

      if (topId in cache) {
        stack.pop();
      } else {
        const topFunc = this.state.funcFromOutId[topId];
        const unknownDeps = Object.values(topFunc.inputIds).filter(dep => !(dep in cache));
        if (unknownDeps.length == 0) {
          let inputs = {};
          for (let inputName in topFunc.inputIds) {
            inputs[inputName] = cache[topFunc.inputIds[inputName]];
          }
          const outputs = topFunc.eval(inputs);
          for (let outputName in topFunc.outputIds) {
            cache[topFunc.outputIds[outputName]] = outputs[outputName];
          }
          stack.pop();
        } else {
          stack = stack.concat(unknownDeps);
        }
      }
    }
    const finalOut = this.state.finalOut;
    return {r: cache[finalOut.r], g: cache[finalOut.g], b: cache[finalOut.b]};
  }

  componentDidMount() {
    const canvas = this.canvas.current;
    this.ctx = canvas.getContext("2d");
    this.draw(0);
  }

  render() {
    return (
      <div className="App">
        <canvas ref={this.canvas} width={100} height={100} />
      </div>
    );
  }
}

export default App;