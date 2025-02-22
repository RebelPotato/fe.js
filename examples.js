// examples

class Get {}

const ask = send(new Get());

const re1 = ask.then((x) => ask.then((y) => ok(x + y + 1)));
const re2 = re1.then((x) => ask.then((y) => ok(x * y - 1)));

const handleGet = (e) => ({
  Get: (msg, kont) => kont.app(e).handle(handleGet(e)), // kont(e).handle(handleGet(e))
});

console.group("Read effects");
console.log(re1.handle(handleGet(2)).val);
console.log(re2.handle(handleGet(2)).val);
console.groupEnd();

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

const rwe1 = seq(tell("about to read"), re2, (x) =>
  seq(tell(x), tell("end"), ok(x))
);

console.group("Read and write");
console.log(rwe1.handle(handleGet(2)).handle(handlePut).val);
console.log(rwe1.handle(handleGet(2)).handle(handlePutConsole).val());
console.groupEnd();

console.group("R&W Partial handling");
const partially1 = rwe1.handle(handlePutConsole);
const partially2 = rwe1.handle(handleGet(2));
console.log(
  "%cput is handled but not performed, so nothing should print before this line!",
  "font-style: italic;"
);
console.log(partially1.handle(handleGet(2)).val());
console.log(partially2.handle(handlePutConsole).val());
console.groupEnd();

const handleState = (e) => ({
  Get: (msg, kont) => kont.app(e).handle(handleState(e)),
  Put: (msg, kont) => kont.app(msg.val).handle(handleState(msg.val)),
});
console.group("State effects: handling multiple effects at once");
const se1 = seq(tell(10), ask, (x) => seq(tell(x + 10), ask, (y) => ok(x + y)));
console.log(se1.handle(handleState(0)).val);
console.groupEnd();

// nondeterminism
class Fail {} // return empty
const fail = send(new Fail());
class Flip {} // return 0 or 1
const flip = send(new Flip());
const choose = (xs) =>
  xs.reduce((acc, x) => flip.then((b) => (b ? ok(x) : acc)), fail);

const drunkenCoin = flip.then((b) => (b ? choose([true, false]) : fail));
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
