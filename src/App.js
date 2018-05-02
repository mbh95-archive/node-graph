import React, { Component } from 'react';
import './App.css';
import {Const, Abs, Plus, Mult, Cos, RectToPolar} from './Functions.js'

function createShader(gl, type, source) {
  console.log(source);
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  } else {
    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
  }
}

function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  } else {
    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
  }
}

class App extends Component {
  constructor() {
    super();
    this.state = {
      period: 10000.0,
      graph: {
        init: [
          "precision highp float;"
        ],
        uniforms: {
          time: "uniform float u_time;",
          resolution: "uniform vec2 u_resolution;"
        },
        vars: {
          x: "float x = (gl_FragCoord.x / u_resolution.x) * 2.0 - 1.0;",
          y: "float y = (gl_FragCoord.y / u_resolution.y) * 2.0 - 1.0;",
          t: "float t = u_time;"
        },
        out: {
          r: "scaledOut",
          g: "movingOut",
          b: "t"
        },
        finalOut: [
          "gl_FragColor = vec4(r, g, b, 1);"
        ],
        funcs: [
          new Cos("scaledR", "scaledOut"),
          new Cos("movingR", "movingOut"),
          new Const(6.28, "twoPi"),
          new Mult("scaledR", "t", "movingR"),
          new Mult("r", "twoPi", "scaledR"),
          new RectToPolar("x", "y", "r", "theta")
        ]
      }
    };
    this.canvas = React.createRef();
  }

  compileGraphToGlslFragSrc() {
    let fragTxt = this.state.graph.init.join("\n");
    fragTxt += "\n\n";
    fragTxt += Object.values(this.state.graph.uniforms).join("\n");
    fragTxt += "\n\n";
    fragTxt += "void main() {\n";
    fragTxt += Object.values(this.state.graph.vars).join("\n");
    fragTxt += "\n\n";

    let outIdToFunc = {};
    const funcs = this.state.graph.funcs;
    for (let i = 0; i < funcs.length; i++) {
      const func = funcs[i];
      for (let outName in func.outputIds) {
        const outId = func.outputIds[outName];
        outIdToFunc[outId] = func;
      }
    }

    let known = new Set(["x", "y", "t"])
    let stack = [this.state.graph.out.r, this.state.graph.out.g, this.state.graph.out.b];
    while (stack.length > 0) {
      const topId = stack[stack.length - 1];
      if (known.has(topId)) {
        stack.pop();
      } else {
        const topFunc = outIdToFunc[topId];
        const unknownDeps = Object.values(topFunc.inputIds).filter(dep => !(known.has(dep)));
        if (unknownDeps.length == 0) {
          fragTxt += topFunc.toGLSL();
          fragTxt += "\n";
          known.add(topId);
          stack.pop();
        } else {
          stack = stack.concat(unknownDeps);
        }
      }
    }
    fragTxt+= "\n";
    fragTxt += `gl_FragColor = vec4(${this.state.graph.out.r}, ${this.state.graph.out.g}, ${this.state.graph.out.b}, 1);`
    fragTxt += "}"
    return fragTxt;
  }

  getGlslVertSrc() {
    return "attribute vec2 xy_pos;\nvoid main() {\ngl_Position = vec4(xy_pos, 0, 1);\n}";
  }

  componentDidMount() {
    const canvas = this.canvas.current;
    this.gl = canvas.getContext("webgl");
    const vertTxt = this.getGlslVertSrc();
    const fragTxt = this.compileGraphToGlslFragSrc();

    const vertShader = createShader(this.gl, this.gl.VERTEX_SHADER, vertTxt);
    const fragShader = createShader(this.gl, this.gl.FRAGMENT_SHADER, fragTxt);

    const program = createProgram(this.gl, fragShader, vertShader);
    this.setState({program: program});
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

    this.setState({startTime: (new Date()).getTime()});

    requestAnimationFrame(()=>this.update());
  }

  update() {
    const time = (((new Date()).getTime() - this.state.startTime) % this.state.period) / this.state.period;

    console.log(time);

    const resolutionLoc = this.gl.getUniformLocation(this.state.program, "u_resolution");
    this.gl.uniform2f(resolutionLoc, this.gl.canvas.width, this.gl.canvas.height);

    const timeLoc = this.gl.getUniformLocation(this.state.program, "u_time");
    this.gl.uniform1f(timeLoc, time);

    const positionLoc = this.gl.getAttribLocation(this.state.program, "xy_pos");
    this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(positionLoc);

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(()=>this.update());
  }

  render() {
    return (
      <div className="App">
        <canvas ref={this.canvas} width={window.innerWidth} height={window.innerHeight} />
      </div>
    );
  }
}

export default App;