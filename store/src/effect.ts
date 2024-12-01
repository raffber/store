import type { Store, Unsubscriber } from "./store";

export const effect = (fn: EffectCallback): Effect => {
	const eff = new Effect(fn);
	eff.run();
	return eff;
};

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
	private _frozen = false;
	private markedForRun = false;
	private unsubscribers = <Unsubscriber[]>[];
	private cleanup: Destructor | undefined;
	private _stopped = false;

	constructor(private readonly fn: EffectCallback) {}

	private onChanged() {
		if (this._frozen) {
			this.markedForRun = true;
		} else {
			this.run();
		}
	}

	freeze(): void {
		this._frozen = true;
	}

	get frozen(): boolean {
		return this._frozen;
	}

	thaw(): void {
		this._frozen = false;
		if (this.markedForRun) {
			this.markedForRun = false;
			this.run();
		}
	}

	run(): void {
		this.unsubscribe();
		if (this.cleanup) {
			this.cleanup();
			this.cleanup = undefined;
		}
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

	stop(): void {
		this._stopped = true;
		this.unsubscribe();
		if (this.cleanup) {
			this.cleanup();
			this.cleanup = undefined;
		}
	}

	start(): void {
		this._stopped = false;
		this.run();
	}

	get stopped(): boolean {
		return this._stopped;
	}

	private unsubscribe(): void {
		for (const unsub of this.unsubscribers) {
			unsub();
		}
	}
}
