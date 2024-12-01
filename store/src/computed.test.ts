import { computed } from "./computed";
import { describe, it, expect, vi } from "vitest";
import { store as makeStore, type Store } from "./store";

describe("Computed", () => {
	it("should initialize with the correct value", () => {
		const fn = vi.fn(() => 42);
		const store = computed(fn);
		expect(store.get()).toBe(42);
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it("will call the function again if there are no subscribers", () => {
		const fn = vi.fn(() => 42);
		const store = computed(fn);
		store.get();
		store.get();
		expect(fn).toHaveBeenCalledTimes(3);
	});

	it("will cache the value if there are subscribers", () => {
		const fn = vi.fn(() => 42);
		const store = computed(fn);
		store.subscribe(() => {});
		store.get();
		store.get();
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("should initialize with an empty set of subscribers", () => {
		const fn = vi.fn(() => 42);
		const store = computed(fn);
		// biome-ignore lint/complexity/useLiteralKeys: <explanation>
		expect(store["subscribers"].size).toBe(0);
	});

	it("should initialize with an empty set of dependencies", () => {
		const fn = vi.fn(() => 42);
		const store = computed(fn);
		// biome-ignore lint/complexity/useLiteralKeys: <explanation>
		expect(store["deps"].size).toBe(0);
	});

	it("should track store dependencies", () => {
		const parentStore = makeStore({ count: 1 });
		const fn = vi.fn(() => 42 + parentStore.get().count);
		const store = computed(fn);

		// biome-ignore lint/complexity/useLiteralKeys: <explanation>
		expect(store["deps"].size).toBe(1);

		store.subscribe(() => {});
		expect(store.get()).toBe(43);
		expect(store.get()).toBe(43);
		expect(fn).toHaveBeenCalledTimes(1);

		parentStore.update((state) => {
			state.count++;
		});

		expect(store.get()).toBe(44);
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it("should track multiple dependencies transitively", () => {
		const a = makeStore({ count: 1 });
		const b = makeStore({ foo: 1 });
		const c = computed(() => 42 + a.get().count + b.get().foo);
		const fn = vi.fn(() => 10 + c.get());
		const store = computed(fn);

		// biome-ignore lint/complexity/useLiteralKeys: <explanation>
		const deps: Set<Store<unknown>> = store["deps"];
		expect(deps.size).toBe(1);

		store.subscribe(() => {});

		expect(store.get()).toBe(54);
		expect(fn).toHaveBeenCalledTimes(1);

		a.update((state) => {
			state.count++;
		});
		expect(store.get()).toBe(55);
	});

	it("should call the subscriber when the value changes", () => {
		const a = makeStore({ count: 1 });
		const b = makeStore({ foo: 1 });
		const c = computed(() => 42 + a.get().count + b.get().foo);

		const store = computed(() => 10 + c.get());
		const subs = vi.fn();
		store.subscribe(subs);

		expect(subs).toHaveBeenCalledTimes(0);

		a.update((state) => {
			state.count++;
		});
		expect(subs).toHaveBeenCalledTimes(1);
	});
});
