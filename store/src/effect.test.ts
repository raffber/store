import { describe, it, expect, vi } from "vitest";
import { effect } from "./effect";
import { store } from "./store";

describe("effect", () => {
	it("should run the effect initially", () => {
		const fn = vi.fn(() => {});
		const eff = effect(fn);
		expect(fn).toBeCalledTimes(1);
	});

	it("it should tack dependencies", () => {
		const a = store({ count: 1 });
		const cleanup = vi.fn(() => {});

		let result = 0;
		const fn = vi.fn(() => {
			result = 10 + a.get().count;
			return cleanup;
		});
		const eff = effect(fn);
		expect(fn).toBeCalledTimes(1);
		expect(result).toBe(11);

		a.update((state) => {
			state.count++;
		});
		expect(fn).toBeCalledTimes(2);
		expect(cleanup).toBeCalledTimes(1);
		expect(result).toBe(12);

		eff.stop();

		a.update((state) => {
			state.count++;
		});

		expect(fn).toBeCalledTimes(2);
		expect(cleanup).toBeCalledTimes(2);
		expect(result).toBe(12);

		eff.start();
		expect(fn).toBeCalledTimes(3);
		expect(cleanup).toBeCalledTimes(2);
		expect(result).toBe(13);
	});

	it("should not run the effect if it is frozen", () => {
		const a = store({ count: 1 });
		const cleanup = vi.fn(() => {});

		let result = 0;
		const fn = vi.fn(() => {
			result = 10 + a.get().count;
			return cleanup;
		});
		const eff = effect(fn);
		expect(fn).toBeCalledTimes(1);
		expect(result).toBe(11);

		eff.freeze();

		a.update((state) => {
			state.count++;
		});
		expect(fn).toBeCalledTimes(1);
		expect(result).toBe(11);

		eff.thaw();
		expect(fn).toBeCalledTimes(2);
		expect(cleanup).toBeCalledTimes(1);
		expect(result).toBe(12);
	});

	it("should track depenedencies transitively", () => {
		const a = store({ count: 1 });
		const b = store({ foo: 1 });
		const cleanup = vi.fn(() => {});

		let result = 0;
		const fn = vi.fn(() => {
			result = 10 + a.get().count + b.get().foo;
			return cleanup;
		});
		const eff = effect(fn);
		expect(fn).toBeCalledTimes(1);
		expect(result).toBe(12);

		a.update((state) => {
			state.count++;
		});
		expect(fn).toBeCalledTimes(2);
		expect(cleanup).toBeCalledTimes(1);
		expect(result).toBe(13);

		b.update((state) => {
			state.foo++;
		});
		expect(fn).toBeCalledTimes(3);
		expect(cleanup).toBeCalledTimes(2);
		expect(result).toBe(14);
	});
});
