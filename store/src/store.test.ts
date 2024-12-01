import { describe, expect, it } from "vitest";
import { store as makeStore } from "./store";

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
});
