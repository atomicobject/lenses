import { Lens, Prism, Isomorphism } from "../index";
import { flow } from "lodash";

describe("Lens", () => {
  describe("an instance/.of()", () => {
    const lowBitLens = Lens.of<number, boolean>({
      get: n => (n & 1 ? true : false),
      set: (n, b) => (b ? n | 1 : n & ~1)
    });

    it("can get the value with #get()", () => {
      expect(lowBitLens.get(10)).toBe(false);
      expect(lowBitLens.get(11)).toBe(true);
    });

    it("can get the value like a function", () => {
      expect(lowBitLens(10)).toBe(false);
      expect(lowBitLens(11)).toBe(true);
    });

    it("can set the value directly", () => {
      expect(lowBitLens.set(10, false)).toBe(10);
      expect(lowBitLens.set(10, true)).toBe(11);
      expect(lowBitLens.set(11, false)).toBe(10);
      expect(lowBitLens.set(11, true)).toBe(11);
    });

    it("can create a setter by just passing a value", () => {
      expect(lowBitLens.set(false)(11)).toBe(10);
      expect(lowBitLens.set(true)(10)).toBe(11);
    });

    it("can create a value updater", () => {
      const toggleBit = lowBitLens.update(b => !b);
      expect(toggleBit(15)).toBe(14);
      expect(toggleBit(92)).toBe(93);
    });

    it("can update a value", () => {
      expect(lowBitLens.update(9, b => !b)).toBe(8);
    });
  });

  describe(".from<T>().prop(...keyPath)", () => {
    it("can point to a property of an object", () => {
      type Something = { foo: number; bar: string };
      const Something = {
        foo: Lens.from<Something>().prop("foo"),
        bar: Lens.from<Something>().prop("bar")
      };

      let o: Something = { foo: 1, bar: "hello" };
      // Lenses act like functions to get
      expect(Something.foo(o)).toBe(1);
      expect(Something.bar(o)).toEqual("hello");
      // Or explicitly get the value
      expect(Something.foo.get(o)).toBe(1);

      // Set a value into the object
      let o2 = Something.foo.set(o, 10);
      expect(o2).toEqual({ foo: 10, bar: "hello" });
      expect(o).toEqual({ foo: 1, bar: "hello" });

      let o3 = Something.foo.update(o, i => i + 1);
      expect(o3).toEqual({ foo: 2, bar: "hello" });

      // Or create an O => O function that updates it's argument,
      // and pass o to that. Useful with lodash.flow
      let o4 = Something.foo.set(10)(o);
      expect(o4).toEqual(o2);

      let o5 = flow(
        Something.foo.update(i => 10 * i),
        Something.bar.set("world")
      )(o);
      expect(o5).toEqual({ foo: 10, bar: "world" });

      type ContainsSomething = {
        something: Something;
      };
      let containerFoo = Lens.from<ContainsSomething>()
        .prop("something")
        .comp(Something.foo);

      const container: ContainsSomething = {
        something: { foo: 19, bar: "hola" }
      };
      expect(containerFoo(container)).toEqual(19);

      let n2s: Isomorphism<number, string> = {
        to: n => n.toString(),
        from: s => parseInt(s, 10)
      };
      const sFoo = Lens.map(Something.foo, n2s);
      expect(sFoo(o)).toEqual("1");
      const o6 = sFoo.set(o, "1234");
      expect(o6).toEqual({ foo: 1234, bar: "hello" });
    });

    it("can update deeply nested structures, type-safely", () => {
      interface O {
        foo: { bar: { baz: number } };
      }
      let o: O = { foo: { bar: { baz: 1 } } };
      let l = Lens.from<O>().prop("foo", "bar", "baz");
      expect(l.get(o)).toBe(1);

      let o2 = l.set(o, 10);
      expect(o2).toEqual({ foo: { bar: { baz: 10 } } });
      expect(o2).not.toBe(o);
    });

    it("Supports potentially-undefined values", () => {
      type Something = { foo: number|undefined; bar: string };
      const Something = {
        foo: Lens.from<Something>().prop("foo"),
        bar: Lens.from<Something>().prop("bar")
      };

      let o: Something = { foo: 1, bar: "hello" };
      // Lenses act like functions to get
      expect(Something.foo(o)).toBe(1);

      expect(Something.foo.set(o, undefined)).toEqual({
        foo: undefined, bar: "hello"
      })
    });
  });
});
