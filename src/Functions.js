export class Function {
  constructor(type, inputs, outputs) {
    this.type = type;
    this.inputs = inputs;
    this.outputs = outputs;
  }
}

export class Input {
  constructor(id, defaultValue) {
    this.id = id;
    this.defaultValue = defaultValue;
  }
}

export class Output {
  constructor(id) {
    this.id = id;
  }
}

export class Const extends Function {
  constructor(val, outId) {
    super("Const",
      {},
      { out: new Output(outId) });
    this.val = val;
  }
}

export class Abs extends Function {
  constructor(opId, absId) {
    super("Abs",
      { op: new Input(opId, 0.0) },
      { abs: new Output(absId) });
  }
}

export class Plus extends Function {
  constructor(op1Id, op2Id, sumId) {
    super("Plus",
      {
        op1: new Input(op1Id, 0.0),
        op2: new Input(op2Id, 0.0)
      },
      { sum: new Output(sumId) });
  }
}

export class Mult extends Function {
  constructor(op1Id, op2Id, prodId) {
    super("Mult",
      {
        op1: new Input(op1Id, 1.0),
        op2: new Input(op2Id, 1.0)
      },
      { prod: new Output(prodId) });
  }
}

export class RectToPolar extends Function {
  constructor(xId, yId, rId, thetaId) {
    super("RectToPolar",
      {
        x: new Input(xId, 0.0),
        y: new Input(yId, 0.0)
      },
      {
        r: new Output(rId),
        theta: new Output(thetaId)
      });
  }
}

export class Cos extends Function {
  constructor(thetaId, outId) {
    super("Cos",
      { theta: new Input(thetaId, 0.0) },
      { out: new Output(outId) });
  }
}