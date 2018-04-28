import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import {Abs, Plus} from './Functions.js'

class App extends Component {
  constructor() {
    super();
    this.state = {
      w: 100,
      h: 100,
      time: 0.0,
      finalOut: {
        r: "absOut",
        g: "absOut",
        b: "absOut"
      },
      funcs: [
        new Plus("x", "y", "xpy"),
        new Abs("xpy", "absOut")
      ],
      funcFromOutId: {},
    };

    // Generate the dependency map
    // Map output ids to list of dependency input ids
    var funcFromOutId = {}
    const funcs = this.state.funcs;
    for (var i = 0; i < funcs.length; i++) {
      const func = funcs[i];
      for (var outName in func.outputIds) {
        const outId = func.outputIds[outName];
        funcFromOutId[outId] = func;
      }
    }
    this.state.funcFromOutId = funcFromOutId;
    console.log(funcFromOutId);
    this.runGraph(-2,-8,3);
  }

  runGraph(x, y, t) {
    const funcs = this.state.funcs;
    var stack = [];
    var cache = {
      x: x,
      y: y,
      t: t
    };

    //Generate the initial stack
    for (var finalOutName in this.state.finalOut) {
      const finalOutValueId = this.state.finalOut[finalOutName];
      stack.push(finalOutValueId);
    }
    console.log(stack);

    while(stack.length > 0) {
      const topId = stack[stack.length - 1];
      console.log(topId);
      console.log(stack);
      console.log(cache);

      if (topId in cache) {
        stack.pop();
      } else {
        const topFunc = this.state.funcFromOutId[topId];
        const unknownDeps = Object.values(topFunc.inputIds).filter(dep => !(dep in cache));
        if (unknownDeps.length == 0) {
          var inputs = {};
          for (var inputName in topFunc.inputIds) {
            inputs[inputName] = cache[topFunc.inputIds[inputName]];
          }
          const outputs = topFunc.eval(inputs);
          for (var outputName in topFunc.outputIds) {
            cache[topFunc.outputIds[outputName]] = outputs[outputName];
          }
          stack.pop();
        } else {
          stack = stack.concat(unknownDeps);
        }
      }
    }
  }

  componentDidMount() {
    const canvas = this.refs.canvas;
    const ctx = canvas.getContext("2d");
    ctx.moveTo(0, 0);
    ctx.lineTo(200, 100);
    ctx.stroke();
  }
  render() {
    return (
      <div className="App">
        <canvas ref="canvas" width={200} height={100} />
      </div>
    );
  }
}

export default App;