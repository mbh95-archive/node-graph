class Function {
  constructor(type, inputIds, outputIds) {
    this.type = type;
    this.inputIds = inputIds;
    this.outputIds = outputIds;
  }
}

export class Const extends Function {
  constructor(val, outId) {
    super("Const", {}, {out: outId});
    this.val = val;
  }
}

export class Abs extends Function {
  constructor(opId, absId) {
    super("Abs", {op:opId}, {abs:absId});
  }
}

export class Plus extends Function {
  constructor(op1Id, op2Id, sumId) {
    super("Plus", {op1:op1Id, op2:op2Id}, {sum:sumId});
  }
}

export class Mult extends Function {
  constructor(op1Id, op2Id, prodId) {
    super("Mult", {op1:op1Id, op2:op2Id}, {prod:prodId});
  }
}

export class RectToPolar extends Function {
  constructor(xId, yId, rId, thetaId) {
    super("RectToPolar", {x:xId, y:yId}, {r:rId, theta:thetaId});
  }
}

export class Cos extends Function {
  constructor(thetaId, outId) {
    super("Cos", {theta:thetaId}, {out:outId});
  }
}