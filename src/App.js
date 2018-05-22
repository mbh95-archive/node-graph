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
      time: 0.0,
      period: 10000.0,
      graph: {
        funcs: [
          new Const(.5, "shift_amp"),
          new Const(10, "shift_period_coef"),
          new Abs("abs_in", "abs_out"),
          new Mult("amp_mult_coef", "amp_mult_val", "amp_out"),
          new Mult("per_mult_coef", "per_mult_val", "per_out"),
          new Plus("tpx_t", "tpx_x", "tpx_out"),
          new Cos("shift_cos_in", "shift_cos_out"),
          new Plus("shift_add_x", "shift_add_c", "shift_add_out"),
          new Cos("scale_cos_in", "scale_cos_out"),
          new Cos("time_cos_in", "time_cos_out"),
          new Const(6.28, "two_pi"),
          new Mult("time_mult_in1", "time_mult_in2", "time_mult_out"),
          new Mult("scale_mult_in1", "scale_mult_in2", "scale_mult_out"),
          new RectToPolar("r2p_x", "r2p_y", "r2p_r", "r2p_theta"),
        ],
        edges: {
          // dest: src
          "per_mult_coef": "shift_period_coef",
          "per_mult_val": "tpx_out",
          "tpx_t": "t",
          "tpx_x": "x",
          "amp_mult_coef": "shift_amp",
          "amp_mult_val": "abs_out",
          "abs_in": "shift_cos_out",
          "shift_cos_in": "per_out",
          "shift_add_c": "amp_out",
          "shift_add_x": "x",
          "r2p_x": "shift_add_out",
          "r2p_y": "y",
          "time_mult_in2": "t",
          "b": "t",
          "scale_mult_in2": "r2p_r",
          "scale_mult_in1": "two_pi",
          "time_mult_in1": "scale_mult_out",
          "scale_cos_in": "scale_mult_out",
          "time_cos_in": "time_mult_out",
          "r": "scale_cos_out",
          "g": "time_cos_out"
        }
      }
    };
    this.canvas = React.createRef();
  }

  compileGraphToGlslFragSrc() {
    // A Graph is valid if
    // 1. No two input ids are the same. This includes implicit "r", "g", "b" input ids.
    // 2. No two output ids are the same. This includes implicit "x", "y", "t" output ids.
    // (1+2). We could strengthen these conditions and just say all ids must be unique and none can be "r", "g", "b", "x", "y", or "t".
    // 3. Each input id has either zero edges or one edge leading to it. This is now guaranteed by the way edges are stored.
    // 4. Each edge input/output id is a valid input/output id.
    // 5. The graph is acyclic.
    // (6). Not a graph property, but for our purposes each output id must be a valid GLSL variable name or be uniquely translatable into one.
    
    const funcs = this.state.graph.funcs;
    const edges = this.state.graph.edges;

    // Validate nodes
    // * Each input id must be unique (including the implicit "r", "g", "b" input ids).
    // * Each output id must be unique (including the implicit "x", "y", "t" output ids).
    // * Each output id must be a valid GLSL variable name.
    const varRegexp = /^[a-zA-Z_]\w*$/;

    let inputIdSet = new Set(["r", "g", "b"]);
    let outputIdSet = new Set(["x", "y", "t"]);

    for (const func of funcs) {
      for (const inId of Object.values(func.inputIds)) {
        if (inputIdSet.has(inId)) {
          throw new Error(`Invalid graph: Duplicate input ID "${inId}"`);
        } else {
          inputIdSet.add(inId);
        }
      }
      for (const outId of Object.values(func.outputIds)) {
        if (!outId.match(varRegexp)) {
          throw new Error(`Invalid graph: Output ID "${outId}" not a valid GLSL variable name.`);
        }
        if (outputIdSet.has(outId)) {
          throw new Error(`Invalid graph: Duplicate output ID "${outId}"`);
        } else {
          outputIdSet.add(outId);
        }
      }
    }

    // Validate edges
    // * Each edge must lead from a valid output id to a valid input id.
    for (const edgeIn of Object.keys(edges)) {
      const edgeOut = edges[edgeIn];
      if (!inputIdSet.has(edgeIn) || !outputIdSet.has(edgeOut)) {
        throw new Error(`Invalid graph: Bad edge ${edgeOut} -> ${edgeIn}`);
      }
    }

    let outIdToFunc = {};
    for (const func of funcs) {
      for (const outName in func.outputIds) {
        const outId = func.outputIds[outName];
        outIdToFunc[outId] = func;
      }
    }

    let orderedFuncs =[];
    let known = new Set(["x", "y", "t"]);
    let awaitingFuncs = new Set([]);
    let stack = [];
    
    // "r", "g", and "b" are assigned a default value of zero if they have no incoming edges.
    let r_in = "0";
    if ("r" in edges) {
      stack.push(edges["r"]);
      r_in = edges["r"];
    }

    let g_in = "0";
    if ("g" in edges) {
      stack.push(edges["g"]);
      g_in = edges["g"];
    }

    let b_in = "0";
    if ("b" in edges) {
      stack.push(edges["b"]);
      b_in = edges["b"];
    }

    while (stack.length > 0) {
      const topId = stack[stack.length - 1];
      if (known.has(topId)) {
        stack.pop();
      } else {
        const topFunc = outIdToFunc[topId];
        const unknownDeps = Object.values(topFunc.inputIds)
          .map(input => edges[input])
          .filter(output => !known.has(output));
        if (unknownDeps.length === 0) {
          orderedFuncs.push(topFunc);
          for (const outId of Object.values(topFunc.outputIds)) {
            known.add(outId);
          }
          awaitingFuncs.delete(topFunc);
          stack.pop();
        } else {
          if (awaitingFuncs.has(topFunc)) {
            throw new Error(`Invalid graph: Cycle detected at ${topId}`);
          }
          stack = stack.concat(unknownDeps);
          awaitingFuncs.add(topFunc);
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
            return `float ${func.outputIds.out} = float(${func.val});`;
          case "Abs":
            return `float ${func.outputIds.abs} = abs(${edges[func.inputIds.op]});`;
          case "Plus":
            return `float ${func.outputIds.sum} = ${edges[func.inputIds.op1]} + ${edges[func.inputIds.op2]};`;
          case "Mult":
            return `float ${func.outputIds.prod} = ${edges[func.inputIds.op1]} * ${edges[func.inputIds.op2]};`;
          case "RectToPolar":
            return `float ${func.outputIds.r} = (${edges[func.inputIds.x]} * ${edges[func.inputIds.x]}) + (${edges[func.inputIds.y]} * ${edges[func.inputIds.y]});\n`
              + `float ${func.outputIds.theta} = atan(${edges[func.inputIds.y]}, ${edges[func.inputIds.x]});`;
          case "Cos":
            return `float ${func.outputIds.out} = cos(${edges[func.inputIds.theta]});`;
          default:
            return "";
          }
        }).join("\n")}
        gl_FragColor = vec4(${r_in}, ${g_in}, ${b_in}, 1);
    }
    `;
  }

  getDefaultGlslFragSrc() {
    return `
    void main() {
      gl_FragColor = vec4(1, 0, 1, 1);
    }`
  }
  getGlslVertSrc() {
    return `
    attribute vec2 xy_pos;
    void main() {
      gl_Position = vec4(xy_pos, 0, 1);
    }`;
  }

  componentDidMount() {
    const canvas = this.canvas.current;
    this.gl = canvas.getContext("webgl");

    const vertTxt = this.getGlslVertSrc();
    let fragTxt = this.getDefaultGlslFragSrc();
    try {
      fragTxt = this.compileGraphToGlslFragSrc();
    } catch(error) {
      console.log(error);
    }

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

    const positionLoc = this.gl.getAttribLocation(program, "xy_pos");
    this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(positionLoc);

    

    this.setState({startTime: (new Date()).getTime()});

    requestAnimationFrame(()=>this.update());
  }

  resize() {
    const new_width = this.gl.canvas.clientWidth;
    const new_height = this.gl.canvas.clientHeight;
    if (this.gl.canvas.width != new_width || this.gl.canvas.height != new_height) {
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

    requestAnimationFrame(()=>this.update());
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