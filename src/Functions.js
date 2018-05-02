class Function {
  constructor() {
    this.inputIds = {};
    this.outputIds = {};
  }
  eval() {
    alert(JSON.stringify(this) + " doesn't have an eval!");
  }
}

export class Const extends Function {
  constructor(val, outId) {
    super();
    this.type = "Const";
    this.outputIds.out = outId;
    this.val = val;
  }

  eval(inputs) {
    return {out:this.val};
  }

  toGLSL() {
    return `float ${this.outputIds.out} = ${this.val};`
  }
}

export class Abs extends Function {
  constructor(opId, absId) {
    super();
    this.type = "Abs";
    this.inputIds.op = opId;
    this.outputIds.abs = absId;
  }

  eval(inputs) {
    return {abs: Math.abs(inputs.op)};
  }

  toGLSL() {
    return `float ${this.outputIds.abs} = abs(${this.inputIds.op});`
  }
}

export class Plus extends Function {
  constructor(op1Id, op2Id, sumId) {
    super();
    this.type = "Plus";
    this.inputIds.op1 = op1Id;
    this.inputIds.op2 = op2Id;
    this.outputIds.sum = sumId;
  }

  eval(inputs) {
    return {sum: (inputs.op1 + inputs.op2)};
  }

  toGLSL() {
    return `float ${this.outputIds.sum} = ${this.inputIds.op1} + ${this.inputIds.op2};`
  }
}

export class Mult extends Function {
  constructor(op1Id, op2Id, prodId) {
    super();
    this.type = "Mult";
    this.inputIds.op1 = op1Id;
    this.inputIds.op2 = op2Id;
    this.outputIds.prod = prodId;
  }

  eval(inputs) {
    return {prod: (inputs.op1 * inputs.op2)};
  }

  toGLSL() {
    return `float ${this.outputIds.prod} = ${this.inputIds.op1} * ${this.inputIds.op2};`
  }
}

export class RectToPolar extends Function {
  constructor(xId, yId, rId, thetaId) {
    super();
    this.type = "RectToPolar";
    this.inputIds.x = xId;
    this.inputIds.y = yId;
    this.outputIds.r = rId;
    this.outputIds.theta = thetaId;
  }

  eval(inputs) {
    return {
      r: inputs.x ** 2 + inputs.y ** 2,
      theta: Math.atan2(inputs.y, inputs.x)
    };
  }

  toGLSL() {
    return `float ${this.outputIds.r} = (${this.inputIds.x} * ${this.inputIds.x}) + (${this.inputIds.y} * ${this.inputIds.y});\n`
          + `float ${this.outputIds.theta} = atan(${this.inputIds.y}, ${this.inputIds.x});`
  }
}

export class Cos extends Function {
  constructor(thetaId, outId) {
    super();
    this.type = "Cos";
    this.inputIds.theta = thetaId;
    this.outputIds.out = outId;
  }

  eval(inputs) {
    return {
      out: Math.cos(inputs.theta)
    };
  }

  toGLSL() {
    return `float ${this.outputIds.out} = cos(${this.inputIds.theta});`
  }
}