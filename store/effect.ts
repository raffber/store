import type { Store, Unsubscriber } from "./store";

export type Destructor = () => void;
// biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
export type EffectCallback = () => void | Destructor;

class DependencyTracker {
	dependencies: Set<Store<unknown>> = new Set();

	register(store: Store<unknown>): void {
		this.dependencies.add(store);
	}
}

class DependencyTrackerContext {
	private readonly trackers = <DependencyTracker[]>[];

	push(): DependencyTracker {
		const ret = new DependencyTracker();
		this.trackers.push(ret);
		return ret;
	}

	pop(): void {
		this.trackers.pop();
	}

	register(store: Store<unknown>): void {
		if (this.trackers.length === 0) {
			return;
		}
		const tracker = this.trackers[this.trackers.length - 1];
		if (tracker) {
			tracker.register(store);
		}
	}
}

export const dependencyTrackerContext: DependencyTrackerContext =
	new DependencyTrackerContext();

export class Effect {
	private forzen = false;
	private markedForRun = false;
	private unsubscribers = <Unsubscriber[]>[];
	private cleanup: Destructor | undefined;

	constructor(private readonly fn: EffectCallback) {}

	private onChanged() {
		if (this.forzen) {
			this.markedForRun = true;
		} else {
			this.run();
		}
	}

	freeze(): void {
		this.forzen = true;
	}

	thaw(): void {
		this.forzen = false;
		if (this.markedForRun) {
			this.markedForRun = false;
			this.run();
		}
	}

	run(): void {
		if (this.cleanup) {
			this.cleanup();
			this.cleanup = undefined;
		}
		this.unsubscribe();
		const tracker = dependencyTrackerContext.push();
		try {
			const cleanup = this.fn();
			if (cleanup) {
				this.cleanup = cleanup;
			}
			const deps = tracker.dependencies;
			for (const dep of deps) {
				const unsub = dep.subscribe(() => this.onChanged());
				this.unsubscribers.push(unsub);
			}
			this.markedForRun = false;
		} finally {
			dependencyTrackerContext.pop();
		}
	}

	unsubscribe(): void {
		for (const unsub of this.unsubscribers) {
			unsub();
		}
	}
}

export const effect = (fn: EffectCallback): Effect => {
	const eff = new Effect(fn);
	eff.run();
	return eff;
};
