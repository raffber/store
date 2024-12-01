import { describe, expect, it } from "vitest";
import { type UpdateableStore, store as makeStore } from "./store";
import { lens } from "./lens";

describe("lens", () => {
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
		const l = lens(
			store,
			(state) => state.count,
			(state, newValue) => {
				state.count = newValue;
			},
		);
		let notified = false;
		l.subscribe(() => {
			notified = true;
		});
		l.set(1);
		expect(store.get().count).toBe(1);
		expect(notified).toBe(true);
	});
});
