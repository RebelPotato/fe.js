// (c) 2025 by Chenxuan Huang
// This code is licensed under MIT license (see LICENSE.txt for details)

// the continuation is represented as a queue
// constant time push, append and (amortized) pop(view)
class Kont {
  append(k) {
    console.assert(k instanceof Kont);
    return new Node(this, k);
  }
  pipe(f) {
    return (a) => f(this.app(a));
  }
}
class Leaf extends Kont {
  constructor(value) {
    super();
    this.value = value;
  }
  tilt(t, many) {
    return many(this.value, t);
  }
  view(obj) {
    return obj.One(this.value);
  }
  app(x) {
    return this.value(x);
  }
}
class Node extends Kont {
  constructor(left, right) {
    super();
    this.left = left;
    this.right = right;
  }
  tilt(t, many) {
    return this.left.tilt(new Node(this.right, t), many);
  }
  view(obj) {
    return this.left.tilt(this.right, obj.Many);
  }
  app(x) {
    return this.left.tilt(this.right, (k, t) => k(x).kthen(t)); // inlined this.view({Many: ...})
  }
}
const leaf = (x) => {
  console.assert(x instanceof Function);
  return new Leaf(x);
};

// Effectful computations
class Ok {
  constructor(val) {
    this.val = val;
  }
  kthen(k) {
    return k.app(this.val);
  }
  then(f) {
    return f(this.val);
  }
  handle(handlers) {
    if (handlers.hasOwnProperty("Ok")) return handlers["Ok"](this.val);
    else return this;
  }
}
class Perform {
  constructor(message, kont) {
    this.name = message.constructor.name;
    this.message = message;
    this.kont = kont;
  }
  kthen(k) {
    return new Perform(this.message, this.kont.append(k));
  }
  then(f) {
    console.assert(f instanceof Function);
    return new Perform(this.message, this.kont.append(new Leaf(f)));
  }
  handle(handlers) {
    const name = this.name;
    if (handlers.hasOwnProperty(name))
      return handlers[name](this.message, this.kont); // handle effect
    else
      return new Perform(
        this.message,
        new Leaf(this.kont.pipe((e) => e.handle(handlers)))
      ); // propagate handlers
  }
}
const ok = (x) => new Ok(x);
const perform = (message, kont) => {
  console.assert(kont instanceof Kont);
  return new Perform(message, kont);
};

// helpers
const send = (message) => perform(message, new Leaf(ok));
const sendThen = (message, then) => perform(message, leaf(then)); // implicit check here
const seq = (...es) =>
  es.reduce((acc, eOrf) => {
    if (eOrf instanceof Function) return acc.then(eOrf);
    if (eOrf instanceof Perform || eOrf instanceof Ok)
      return acc.then(() => eOrf);
    throw new Error(
      "arguments should be (Perform | Ok) or (Any -> Perform | Ok)."
    );
  });
const collect = (es) =>
  es.reduce(
    (acc, e) => e.then((x) => acc.then((xs) => ok([...xs, x]))),
    ok([])
  );
