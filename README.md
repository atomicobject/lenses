# Lenses

`@atomic-object/lenses` is a small functional lens library for TypeScript with the goal of being small, with zero dependencies, and strong, precise types. It is inspired by [Aether](https://github.com/xyncro/aether), for F#.

Lenses are getter/setter pairs that let you represent a location within some data structure for both reading and updating that location. "Update" in this case is in the functional sense – not by mutation, but by creating a new data structure with a new value in the location of interest. A little like a pointer offset in C, but memory-, type-, and mutation-safe.


## Basic Usage

The simplest use is to represent a property of an object. Consider this type 

```ts
type Something = { foo: number; bar: string };
```

We could define a helper module with lenses for interacting with this type:

```ts
export namespace Something = {
  export const foo = Lens.from<Something>().prop("foo");
  export const bar = Lens.from<Something>().prop("bar");
}
```

In this example, `Something.foo` has type `Lens<Something, number>`, meaning that it can read numbers from and write numbers to a `Something`. `bar` is inferred to have type `Lens<Something, string>` – it only accepts string values.

Given a value of type `Something`:

```ts
let o: Something = { foo: 1, bar: "hello" };
```

we can get values

```ts
// Get the foo of a Something
expect(Something.foo.get(o)).toBe(1);
// Or just treat the lens as a function to do the same thing:
expect(Something.foo(o)).toBe(1);
expect(Something.bar(o)).toEqual("hello")
```

And we can create updated by `set`ting the lens:

```ts
let o2 = Something.foo.set(o, 10);
expect(o2).toEqual({ foo: 10, bar: "hello" });
expect(o).toEqual({ foo: 1, bar: "hello" });
```

Or `update`-ing the value by running it through a function:

```ts
let o3 = Something.foo.update(o, i => i+1);
expect(o3).toEqual({ foo: 2, bar: 'hello'})
```

## Lens Composition

Lenses can also be composed. This is a powerful technique for building abstractions. While immutability helper and spreads require deep knowledge about the shape of a data structure, violating the [Law of Demeter](https://en.wikipedia.org/wiki/Law_of_Demeter), lenses represent concepts, and programming to them decouples you from the underlying data structure.

For example, consider a container type which contains a `Something` and a value of that type:

```ts
type ContainsSomething = {
  something: Something;
};
const container: ContainsSomething = {
  something: { foo: 19, bar: "hola" }
};
```

We can create a lens for the `something` property, and compose it with our other lenses:

```ts
let innerFoo = Lens.from<ContainsSomething>()
  .prop("something")
  .comp(Something.foo);
expect(containerFoo(container)).toEqual(19);
```

Users of our `innerFoo` lens don't need to couple themselves to either the location of `Something` within `ContainsSomething`, nor the location of the logical value of `foo` within it. We're completely free to reorganize our data structure, provided all users of it are programmed to lenses.

## Currying

Both `set` and `update` are curried – you can provide just a target value or an update function to get back "updater" functions (e.g. `Something => Something`) that can be composed together to make multiple updates at once.

For example,

```ts
import { flow } from "lodash";
let o5 = flow(
  Something.foo.update(i => 10 * i),
  Something.bar.set("world")
)(o);
```

## Custom Lenses

Lenses need not point simply to properties of an object, but can be used for anything that could be logically get/set. The underlying representation need not matter.

For example, we could create a lens that presents the low bit of an integer as a boolean:

```ts
const lowBitLens = Lens.of<number, boolean>({
  get: n => (n & 1 ? true : false),
  set: (n, b) => (b ? n | 1 : n & ~1)
});
```

Given this definition, we're free to read/write booleans into numbers as follows:

```ts
expect(lowBitLens(10)).toBe(false);
expect(lowBitLens(11)).toBe(true);
expect(lowBitLens.set(10, true)).toBe(11);
expect(lowBitLens.set(11, false)).toBe(10);
expect(lowBitLens.update(9, b => !b)).toBe(8);
```

## Isomorphisms

In addition to creating lenses with `Lens.of` that operate on arbitrary substructure – or even equivalent substructure, such as the low-bit lens example – you can also `map` from one lens type to another.

For example, let's say you have a menu component that takes a `MenuProps`. You have `ApplicationState` in your redux store that you want to control your menu, but that state may be in charge of other things as well that should all be consistent. If you can provide a bi-directional mapping between your application state and a `MenuProps`, you could always convert your app state into menu inputs, and changes to the menu props back into equivalent changes in your application state. Your menu, therefore, can think it is operating on a `MenuProps` when instead it's updating `ApplicationState`.

For a simpler example, let's look at an isomorphism that converts numbers to strings, and use it to create a lens that operates on strings, but stores the value as a number.

```ts
let n2s: Isomorphism<number, string> = {
  to: n => n.toString(),
  from: s => parseInt(s, 10)
};
const sFoo = Lens.map(Something.foo, n2s);

let o: Something = { foo: 1, bar: "hello" };
expect(sFoo(o)).toEqual("1");
const o6 = sFoo.set(o, "1234");
expect(o6).toEqual({ foo: 1234, bar: "hello" });
```

## Prisms

We also provide a type for Prisms, which are lenses for which `get` may fail, returning `undefined`. See the code/tests for more examples.


## Functional array helpers

`@atomicobject/lenses/arrays` provides functional versions of `splice`, `pop`, `push`, `unshift`, and `shift`, as well as an `index` function which returns a `Prism` for read/writing an arbitrary index in an array.
