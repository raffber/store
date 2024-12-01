import { describe, expect, it } from "vitest";
import { type Store, type UpdateableStore, lens, lensWithSet, store as makeStore } from "./store";

describe("Store", () => {
    it("should initialize with the given state", () => {
        const initialState = { count: 0 };
        const store = makeStore(initialState);
        expect(store.get()).toEqual(initialState);
    });

    it("should update the state with the given function", () => {
        const initialState = { count: 0 };
        const store = makeStore(initialState);
        store.update((state) => {
            state.count++;
        });
        expect(store.get()).toEqual({ count: 1 });
    });

    it("should not modify a class instance", () => {
        class TestClass {
            constructor(public count: number) {}
        }
        const initialClass = new TestClass(0);
        const initialState = {
            count: 0,
            cls: initialClass,
        };
        const store = makeStore(initialState);
        store.update((state) => {
            state.count++;
        });
        expect(store.get().count).toEqual(1);
        expect(store.get().cls).toStrictEqual(initialClass);
    });

    it("should not modify a class instance even if we modify its field", () => {
        class TestClass {
            constructor(public count: number) {}
        }
        const initialClass = new TestClass(0);
        const initialState = {
            count: 0,
            cls: initialClass,
        };
        const store = makeStore(initialState);
        store.update((state) => {
            state.cls.count++;
        });
        expect(store.get().count).toEqual(0);
        expect(store.get().cls).toStrictEqual(initialClass);
        expect(store.get().cls).toBeInstanceOf(TestClass);
    });

    it("should notify subscribers when the state changes", () => {
        const initialState = { count: 0 };
        const store = makeStore(initialState);
        let notified = false;
        store.subscribe(() => {
            notified = true;
        });
        store.update((state) => {
            state.count++;
        });
        expect(notified).toBe(true);
    });

    it("should unsubscribe a subscriber", () => {
        const initialState = { count: 0 };
        const store = makeStore(initialState);
        let notified = false;
        const unsubscribe = store.subscribe(() => {
            notified = true;
        });
        unsubscribe();
        store.update((state) => {
            state.count++;
        });
        expect(notified).toBe(false);
    });

    it("should update the parent state of a lens", () => {
        const initialState = { count: 0 };
        const store = makeStore(initialState);
        const l = lens(store, (state) => state.count);
        let notified = false;
        l.subscribe(() => {
            notified = true;
        });
        store.update((state) => {
            state.count++;
        });
        expect(notified).toBe(true);
    });

    it("should not update a lens if the value does not change", () => {
        const initialState = { count: 0, foo: "bar" };
        const store = makeStore(initialState);
        const l = lens(store, (state) => state.count);
        let notified = false;
        l.subscribe(() => {
            notified = true;
        });
        store.update((state) => {
            state.foo = "baz";
        });
        expect(notified).toBe(false);
    });

    it("nested stores are supported", () => {
        type ParentState = {
            child: UpdateableStore<{
                count: number;
            }>;
        };
        const parent = makeStore<ParentState>({
            child: makeStore({ count: 0 }),
        });

        const parentUpdated = { value: false };
        const childUpdated = { value: false };

        parent.subscribe(() => {
            parentUpdated.value = true;
        });
        parent.get().child.subscribe(() => {
            childUpdated.value = true;
        });

        parent.update((state) => {
            state.child.update((childState) => {
                childState.count++;
            });
        });

        expect(parent.get().child.get().count).toBe(1);
        expect(parentUpdated.value).toBe(true);
        expect(childUpdated.value).toBe(true);
    });

    it("can be nested with a custom setter", () => {
        const initialState = { count: 0 };
        const store = makeStore(initialState);
        const lens = lensWithSet(store,
            (state) => state.count,
            (state, newValue) => {
                state.count = newValue;
            }
        );
        let notified = false;
        lens.subscribe(() => {
            notified = true;
        });
        lens.set(1);
        expect(store.get().count).toBe(1);
        expect(notified).toBe(true);
    });
});
