// queue with constant time push, pop and (amortized) append as kontinuation function
class Leaf {
  constructor(value) {
    if (!(value instanceof Function))
      throw new Error("Leaf: value should be a function.");
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
class Node {
  constructor(left, right) {
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
    return this.left.tilt(this.right, (k, t) => k(x).kthen(t)); // inlined this.view
  }
}
const leaf = (x) => new Leaf(x);
const push = (t, x) => new Node(t, leaf(x));
const append = (t1, t2) => new Node(t1, t2);
const kComp = (k, f) => (a) => f(k.app(a));

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
const ok = (x) => new Ok(x);

class Perform {
  constructor(message, kont) {
    this.message = message;
    if (!(kont instanceof Leaf) && !(kont instanceof Node))
      throw new Error(
        "Perform: kont should be a tree. Use leaf to wrap a function into a tree."
      );
    this.kont = kont;
  }
  kthen(k) {
    return new Perform(this.message, append(this.kont, k));
  }
  then(f) {
    return new Perform(this.message, push(this.kont, f));
  }
  handle(handlers) {
    const name = this.message.constructor.name;
    if (handlers.hasOwnProperty(name))
      return handlers[name](this.message, this.kont); // handle effect
    else
      return new Perform(
        this.message,
        leaf(kComp(this.kont, (e) => e.handle(handlers)))
      ); // propagate handlers
  }
}
const perform = (message, kont) => new Perform(message, kont);
const send = (message) => perform(message, leaf(ok));
const sendThen = (message, then) => perform(message, leaf(then));

const seq = (...es) =>
  es.reduce((acc, eOrf) => {
    if (eOrf instanceof Function) return acc.then(eOrf);
    if (eOrf instanceof Perform || eOrf instanceof Ok)
      return acc.then(() => eOrf);
    throw new Error(
      "seq: arguments should be (Perform | Ok) or (Any -> Perform | Ok)."
    );
  });
const collect = (es) =>
  es.reduce(
    (acc, e) => e.then((x) => acc.then((xs) => ok([...xs, x]))),
    ok([])
  );
