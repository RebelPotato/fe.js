import { send, sendThen, ok, seq, collect } from "./fe.js";

// read effects
class Get {}
const ask = send(new Get());
const re1 = ask.then((x) => ask.then((y) => ok(x + y + 1)));
const re2 = re1.then((x) => ask.then((y) => ok(x * y - 1)));

const handleGet = (e) => ({
  Get: (msg, kont) => kont.app(e).handle(handleGet(e)),
});

console.group("Read effects");
console.log(re1.handle(handleGet(2)).val);
console.log(re2.handle(handleGet(2)).val);
console.groupEnd();

// write effects
class Put {
  constructor(val) {
    this.val = val;
  }
}
const tell = (val) => send(new Put(val));
const we1 = (m) =>
  seq(tell("about to do m"), m(), (x) => seq(tell(x), tell("done"), ok(x)));
const handlePut = {
  Ok: (x) => ok([[], x]),
  Put: (msg, kont) =>
    kont
      .app(undefined)
      .handle(handlePut)
      .then(([log, val]) => ok([[msg.val, ...log], val])),
};
const handlePutConsole = {
  Ok: (x) => ok(() => x),
  Put: (msg, kont) =>
    kont
      .app(undefined)
      .handle(handlePutConsole)
      .then((x) =>
        ok(() => {
          console.log(msg.val);
          return x();
        })
      ),
};

console.group("Write effects");
console.log(we1(() => ok(3)).handle(handlePut).val);
console.log(
  we1(() => ok(3))
    .handle(handlePutConsole)
    .val()
);
console.groupEnd();

// read and write
const rwe1 = seq(tell("about to read"), re2, (x) =>
  seq(tell(x), tell("end"), ok(x))
);

console.group("Read and write");
console.log(rwe1.handle(handleGet(2)).handle(handlePut).val);
console.log(rwe1.handle(handleGet(2)).handle(handlePutConsole).val());
console.groupEnd();

console.group("Read and write: Partial handling");
const partially1 = rwe1.handle(handlePutConsole);
const partially2 = rwe1.handle(handleGet(2));
console.log(
  "%cput is handled but not performed, so nothing should print before this line!",
  "font-style: italic;"
);
console.log(partially1.handle(handleGet(2)).val());
console.log(partially2.handle(handlePutConsole).val());
console.groupEnd();

// state effects: multiple effects at once
const handleState = (e) => ({
  Get: (msg, kont) => kont.app(e).handle(handleState(e)),
  Put: (msg, kont) => kont.app(msg.val).handle(handleState(msg.val)),
});
console.group("State effects: handling multiple effects at once");
const se1 = seq(tell(10), ask, (x) => seq(tell(x + 10), ask, (y) => ok(x + y)));
console.log(se1.handle(handleState(0)).val);
console.groupEnd();

// nondeterminism
class Fail {} // this branch fails
const fail = send(new Fail());
class Flip {} // two branches, return 0 and 1
const flip = send(new Flip());
const flipThen = (f) => sendThen(new Flip(), f);
const choose = (xs) =>
  xs.reduce((acc, x) => flipThen((b) => (b ? ok(x) : acc)), fail);

const drunkenCoin = flipThen((b) => (b ? choose([true, false]) : fail));
const drunkenCoins = (n) => collect(Array(n).fill(drunkenCoin));

const handleChoose = {
  Ok: (x) => ok([x]),
  Flip: (msg, kont) =>
    kont
      .app(true)
      .handle(handleChoose)
      .then((x) =>
        kont
          .app(false)
          .handle(handleChoose)
          .then((y) => ok([...x, ...y]))
      ),
  Fail: (msg, kont) => ok([]),
};
console.group("Nondeterminism");
console.log(drunkenCoins(10).handle(handleChoose).val);
console.groupEnd();

const mplus = (e1, e2) => flipThen((b) => (b ? e1 : e2));
const msum = (es) => es.reduce(mplus);
const msplit = (e) => {
  const loop = (jq, e) =>
    e.handle({
      Ok: (x) => ok([x, jq.length === 0 ? fail : msum(jq)]),
      Fail: (msg, kont) =>
        jq.length === 0 ? ok(undefined) : loop(jq.slice(1), jq[0]),
      Flip: (msg, kont) => loop([kont.app(false), ...jq], kont.app(true)),
    });
  return loop([], e);
};
const ifte = (t, th, el) =>
  msplit(t).then((x) => {
    if (x === undefined) return el;
    const [sg1, sg2] = x;
    return mplus(th(sg1), sg2.then(th));
  });
const once = (m) => msplit(m).then((x) => (x === undefined ? fail : ok(x[0])));
const guard = (b) => (b ? ok(undefined) : fail);

const range = (a, b) => {
  const acc = [];
  for (let i = a; i <= b; i++) acc.push(i);
  return acc;
};
const gen = (n) => msum(range(2, n).map(ok));
const primeIfte1 = gen(30).then((n) =>
  ifte(
    once(
      gen(30).then((d) =>
        seq(guard(d < n && n % d === 0), tell(`${n} % ${d} === ${n % d}`))
      )
    ),
    () => fail,
    ok(n)
  )
);
const primeIfte2 = gen(15).then((n) =>
  ifte(
    gen(15).then((d) =>
      seq(
        guard(d < n && n % d === 0),
        guard(n % d === 0),
        tell(`${n} % ${d} === ${n % d}`)
      )
    ),
    () => fail,
    ok(n)
  )
);
console.group("Non-deterministic if-then-else and once + write");
console.log(
  "%cWith short-circuiting, only one d for each n.",
  "font-style: italic;"
);
console.log(primeIfte1.handle(handleChoose).handle(handlePutConsole).val());
console.log(
  "%cWithout short-circuiting, all ds are printed.",
  "font-style: italic;"
);
console.log(primeIfte2.handle(handleChoose).handle(handlePutConsole).val());
console.groupEnd();
