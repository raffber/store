import { describe, expect, it } from "vitest";
import { type Store, store as makeStore } from "./store";

describe("Store", () => {
    it("should initialize with the given state", () => {
        const initialState = { count: 0 };
        const store = makeStore(initialState);
        expect(store.value).toEqual(initialState);
    });

    it("should update the state with the given function", () => {
        const initialState = { count: 0 };
        const store = makeStore(initialState);
        store.update((state) => {
            state.count++;
        });
        expect(store.value).toEqual({ count: 1 });
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
        expect(store.value.count).toEqual(1);
        expect(store.value.cls).toStrictEqual(initialClass);
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
        expect(store.value.count).toEqual(0);
        expect(store.value.cls).toStrictEqual(initialClass);
        expect(store.value.cls).toBeInstanceOf(TestClass);
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
        const lens = store.nested((state) => state.count);
        let notified = false;
        lens.subscribe(() => {
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
        const lens = store.nested((state) => state.count);
        let notified = false;
        lens.subscribe(() => {
            notified = true;
        });
        store.update((state) => {
            state.foo = "baz";
        });
        expect(notified).toBe(false);
    });

    it("nested stores are supported", () => {
        type ParentState = {
            child: Store<{
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
        parent.value.child.subscribe(() => {
            childUpdated.value = true;
        });

        parent.update((state) => {
            state.child.update((childState) => {
                childState.count++;
            });
        });

        expect(parent.value.child.value.count).toBe(1);
        expect(parentUpdated.value).toBe(true);
        expect(childUpdated.value).toBe(true);
    });

    it("can be nested with a custom setter", () => {
        const initialState = { count: 0 };
        const store = makeStore(initialState);
        const lens = store.nestedWithSet(
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
        expect(store.value.count).toBe(1);
        expect(notified).toBe(true);
    });
});
