class Function {
  constructor() {
    this.inputIds = {};
    this.outputIds = {};
  }
  eval() {
    alert(JSON.stringify(this) + " doesn't have an eval!");
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
}