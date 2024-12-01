import { dependencyTrackerContext } from "./effect";
import type { Store, Subscriber, Unsubscriber } from "./store";

export function computed<T>(fn: () => T): Store<T> {
	return new Computed(fn);
}

class Computed<T> implements Store<T> {
	private subscribers: Set<Subscriber> = new Set();
	private _recursiveId = 0;
	private cachedValue: T | undefined;
	private unsubscribers = <Unsubscriber[]>[];
	private markForRun = false;

	constructor(private fn: () => T) {
		this.cachedValue = this.fn();
	}

	private onChanged() {
		this.markForRun = true;
		// at this point we just notify, but we don't recompute the value just yet
		// we will recompute it when the value is actually needed
		this.flush();
	}

	get(): T {
		if (this.cachedValue === undefined) {
			this.refresh();
		}
		if (!this.markForRun) {
			return this.cachedValue as T;
		}
		this.refresh();
		return this.cachedValue as T;
	}

	refresh() {
		this.unsubscribe();
		const tracker = dependencyTrackerContext.push();
		try {
			this.cachedValue = this.fn();
			const deps = tracker.dependencies;
			for (const dep of deps) {
				const unsub = dep.subscribe(() => this.onChanged());
				this.unsubscribers.push(unsub);
			}
			this.markForRun = false;
		} finally {
			dependencyTrackerContext.pop();
		}
	}

	subscribe(subscriber: Subscriber): Unsubscriber {
		this.subscribers.add(subscriber);
		return () => {
			this.subscribers.delete(subscriber);
		};
	}

	unsubscribe(): void {
		for (const unsub of this.unsubscribers) {
			unsub();
		}
	}

	private flush() {
		this._recursiveId++;
		const recursiveId = this._recursiveId;
		for (const subscriber of this.subscribers) {
			if (recursiveId !== this._recursiveId) {
				return;
			}
			subscriber();
		}
	}
}
