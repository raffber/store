import { describe, it, expect, vi } from "vitest";
import { effect } from "./effect";
import { store } from "./store";

describe("effect", () => {
	it("should run the effect initially", () => {
		const fn = vi.fn(() => {});
		const eff = effect(fn);
		expect(fn).toBeCalledTimes(1);
	});

	// it("it should tack dependencies", () => {
	// 	const a = store({ count: 1 });
	// 	const cleanup = vi.fn(() => {});

	// 	let result = 0;
	// 	const fn = vi.fn(() => {
	// 		result = 10 + a.get().count;
	// 		return cleanup;
	// 	});
	// 	const eff = effect(fn);
	// 	expect(fn).toBeCalledTimes(1);
	// 	expect(result).toBe(11);

	// 	a.update((state) => {
	// 		state.count++;
	// 	});
	// 	expect(fn).toBeCalledTimes(2);
	// 	expect(cleanup).toBeCalledTimes(1);
	// 	expect(result).toBe(11);
	// });
});
