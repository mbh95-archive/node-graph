import React, { Component } from 'react';
import './App.css';
import { Input, Const, Abs, Plus, Mult, Cos, RectToPolar } from './Functions.js'
import {createProgram, isValidGLSLVarName, getDefaultGlslFragSrc, getDefaultGlslVertSrc} from './GLUtils.js'

class App extends Component {
  constructor() {
    super();
    this.state = {
      time: 0.0,
      period: 10000.0,
      graph: {
        out: {
          r: new Input("scaledOut", 0),
          g: new Input("movingOut", 0),
          b: new Input("t", 0),
        },
        funcs: [
          new Cos("scaledR", "scaledOut"),
          new Cos("movingR", "movingOut"),
          new Const(6.28, "twoPi"),
          new Mult("scaledR", "t", "movingR"),
          new Mult("radius", "twoPi", "scaledR"),
          new RectToPolar("x", "y", "radius", "theta")
        ]
      }
    };
    this.canvas = React.createRef();
  }

  compileGraphToGlslFragSrc() {
    // A Graph is valid if
    // 1. The graph is acyclic.
    // 2. Each value is only output by exactly one function or is one of x, y, t.
    const out = this.state.graph.out;
    const funcs = this.state.graph.funcs;

    let outIdToFunc = {};
    for (const func of funcs) {
      for (const output of Object.values(func.outputs)) {
        if (["x", "y", "t"].includes(output.id) || outIdToFunc.hasOwnProperty(output.id)) {
          throw new Error(`Invalid graph: Multiple definitions for value '${output.id}'`);
        }
        outIdToFunc[output.id] = func;
      }
    }
    console.log(outIdToFunc);

    let orderedFuncs = [];
    let known = new Set(["x", "y", "t"]);
    let awaitingFuncs = new Set([]);
    let stack = [];

    // "r", "g", and "b" are assigned a default value of zero if they have no incoming edges.
    for (var port of ["r", "g", "b"]) {
      if (out[port].id != null) {
        stack.push(out[port].id);
      }
    }
    
    // Populate orderedFuncs and detect cycles
    while (stack.length > 0) {
      const topId = stack[stack.length - 1];
      console.log(topId);
      if (known.has(topId)) {
        // If we already know the value being processed then move on
        stack.pop();
      } else {
        // Otherwise look up the function that produces it and try to put it (and its dependencies) on orderedFuncs
        if (!outIdToFunc.hasOwnProperty(topId)) {
          throw new Error(`Invalid graph: '${topId}' is not defined`);
        }
        const topFunc = outIdToFunc[topId];
        const unknownDeps = Object.values(topFunc.inputs)
          .map(input => input.id)
          .filter(inputId => inputId != null && !known.has(inputId));
        console.log(unknownDeps);
        if (unknownDeps.length === 0) {
          // If all of the inputs to the function are known (or null) then put it on orderedFuncs
          // and add all of its outputs to known
          orderedFuncs.push(topFunc);
          for (const output of Object.values(topFunc.outputs)) {
            if (output.id != null) {
              known.add(output.id);
            }
          }
          awaitingFuncs.delete(topFunc);
          stack.pop();
        } else {
          // If there are unsatisfied dependencies for topFunc then put those dependencies on the stack
          if (awaitingFuncs.has(topFunc)) {
            throw new Error(`Invalid graph: Cycle detected at ${topId}`);
          }
          stack = stack.concat(unknownDeps);
          awaitingFuncs.add(topFunc);
        }
      }
    }

    function getOpOrDefault(input) {
      if (input.id != null) {
        return input.id;
      } else {
        if (Number.isInteger(input.defaultValue)) {
          // GLSL expects doubles to have at least one decimal place.
          return input.defaultValue + ".0";
        } else {
          return input.defaultValue.toString();
        }
      }
    }

    return `
    precision highp float;
    uniform float u_time;
    uniform vec2 u_resolution;
    void main() {
      float x = (gl_FragCoord.x / u_resolution.x) * 2.0 - 1.0;
      float y = (gl_FragCoord.y / u_resolution.y) * 2.0 - 1.0;
      float t = u_time;
      ${orderedFuncs.map((func) => {
        switch (func.type) {
          case "Const":
            return `float ${func.outputs.out.id} = float(${func.val});`;
          case "Abs":
            return `float ${func.outputs.abs.id} = abs(${getOpOrDefault(func.inputs.op)});`;
          case "Plus":
            return `float ${func.outputs.sum.id} = ${getOpOrDefault(func.inputs.op1)} + ${getOpOrDefault(func.inputs.op2)};`;
          case "Mult":
            return `float ${func.outputs.prod.id} = ${getOpOrDefault(func.inputs.op1)} * ${getOpOrDefault(func.inputs.op2)};`;
          case "RectToPolar":
            return `float ${func.outputs.r.id} = (${getOpOrDefault(func.inputs.x)} * ${getOpOrDefault(func.inputs.x)}) + (${getOpOrDefault(func.inputs.y)} * ${getOpOrDefault(func.inputs.y)});\n`
              + `float ${func.outputs.theta.id} = atan(${getOpOrDefault(func.inputs.y)}, ${getOpOrDefault(func.inputs.x)});`;
          case "Cos":
            return `float ${func.outputs.out.id} = cos(${getOpOrDefault(func.inputs.theta)});`;
          default:
            return "";
        }
      }).join("\n")}
        gl_FragColor = vec4(${getOpOrDefault(out.r)}, ${getOpOrDefault(out.g)}, ${getOpOrDefault(out.b)}, 1);
    }
    `;
  }

  componentDidMount() {
    const canvas = this.canvas.current;
    this.gl = canvas.getContext("webgl");

    const vertSrc = getDefaultGlslVertSrc();
    let fragSrc = getDefaultGlslFragSrc();
    try {
      fragSrc = this.compileGraphToGlslFragSrc();
    } catch (error) {
      console.log(error);
    }
    const program = createProgram(this.gl, vertSrc, fragSrc);
    this.setState({ program: program });
    this.gl.useProgram(program);

    const positionBuffer = this.gl.createBuffer();
    const vertices = new Float32Array([
      -1.0, 1.0,
      -1.0, -1.0,
      1.0, 1.0,
      1.0, -1.0
    ]);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

    const positionLoc = this.gl.getAttribLocation(program, "xy_pos");
    this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(positionLoc);

    this.setState({ startTime: (new Date()).getTime() });

    requestAnimationFrame(() => this.update());
  }

  resize() {
    const new_width = this.gl.canvas.clientWidth;
    const new_height = this.gl.canvas.clientHeight;
    if (this.gl.canvas.width !== new_width || this.gl.canvas.height !== new_height) {
      this.gl.canvas.width = new_width;
      this.gl.canvas.height = new_height;
      this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
      const resolutionLoc = this.gl.getUniformLocation(this.state.program, "u_resolution");
      this.gl.uniform2f(resolutionLoc, this.gl.canvas.width, this.gl.canvas.height);
    }
  }

  update() {
    this.resize();

    this.setState({
      time: (((new Date()).getTime() - this.state.startTime) % this.state.period) / this.state.period
    });
    const timeLoc = this.gl.getUniformLocation(this.state.program, "u_time");
    this.gl.uniform1f(timeLoc, this.state.time);

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(() => this.update());
  }

  render() {
    return (
      <div className="App">
        <canvas id="gl-canvas" ref={this.canvas} />
      </div>
    );
  }
}

export default App;