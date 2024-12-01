import { create } from "mutative";
import type { ExternalOptions } from "mutative/dist/interface.js";
import React, { useState } from "react";

type Subscriber = () => void;
type Unsubscriber = () => void;
type Destructor = () => void;
// biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
type EffectCallback = () => void | Destructor;

export interface Store<T> {
    subscribe(subscriber: Subscriber): Unsubscriber;
    nested<U>(fn: (state: T) => U): Store<U>;
    get(): T;
}

export interface Write<T> {
    set(newState: T): void;
}

export interface Update<T> {
    update(fn: (state: T) => void): void;
    nestedWithSet<U>(
        getter: (state: T) => U,
        setter: (state: T, newValue: U) => void
    ): Store<U> & Write<U>;
}

export const store: <T>(initalState: T) => Store<T> & Write<T> = <T>(
    initialState: T
) => {
    return new StoreImpl(initialState);
};

export type UpdateableStore<T> = Store<T> & Update<T>;

export type WritableStore<T> = Store<T> & Write<T> & Update<T>;

class StoreImpl<T> implements Store<T>, Write<T> {
    private _state: T;
    private subscribers: Set<Subscriber>;
    private _recursiveId = 0;

    constructor(initialState: T) {
        this._state = initialState;
        this.subscribers = new Set();
    }

    get(): T {
        effectTrackerContext.register(this);
        return this._state;
    }

    set(newState: T): void {
        this._state = newState;
        this.flush();
    }

    update(fn: (state: T) => void): void {
        const opts: ExternalOptions<false, false> = {
            mark: (target) => {
                if (target instanceof StoreImpl) {
                    return () => target;
                }
                if (target instanceof Lens) {
                    return () => target;
                }
            },
        };
        this._state = create(this._state, fn, opts);
        this.flush();
    }

    subscribe(subscriber: Subscriber): Unsubscriber {
        this.subscribers.add(subscriber);
        return () => {
            this.subscribers.delete(subscriber);
        };
    }

    nested<U>(fn: (state: T) => U): Store<U> {
        return new Lens(this, fn);
    }

    nestedWithSet<U>(
        getter: (state: T) => U,
        setter: (state: T, newValue: U) => void
    ): Store<U> & Write<U> {
        return new LensWithSet(this, getter, setter);
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

class Lens<T, U> implements Store<U> {
    private subscribers: Set<Subscriber> = new Set();
    private lastValue: U;

    constructor(protected parent: Store<T>, private lens: (_: T) => U) {
        this.lastValue = this.lens(parent.get());
        this.parent.subscribe(() => this._onParentChange());
    }

    get(): U {
        return this.lastValue;
    }

    update(fn: (state: U) => void): void {
        this.parent.update((state) => {
            const u = this.lens(state);
            fn(u);
        });
    }

    subscribe(subscriber: Subscriber): Unsubscriber {
        this.subscribers.add(subscriber);
        return () => {
            this.subscribers.delete(subscriber);
        };
    }

    private _onParentChange = () => {
        const v = this.lens(this.parent.get());
        if (this.lastValue !== undefined && this.lastValue === v) {
            return;
        }
        this.lastValue = v;

        for (const subscriber of this.subscribers) {
            subscriber();
        }
    };

    nested<V>(fn: (state: U) => V): Store<V> {
        return new Lens(this.parent, (state) => fn(this.lens(state)));
    }

    nestedWithSet<V>(
        getter: (state: U) => V,
        setter: (state: U, newValue: V) => void
    ): Store<V> & Write<V> {
        return new LensWithSet(this, getter, setter);
    }
}

class LensWithSet<T, U> extends Lens<T, U> implements Write<U> {
    constructor(
        parent: Store<T>,
        getter: (_: T) => U,
        private setter: (_: T, newValue: U) => void
    ) {
        super(parent, getter);
    }

    set(newState: U): void {
        this.parent.update((state) => {
            this.setter(state, newState);
        });
    }
}

class DependencyTracker {
    dependencies: Set<Store<unknown>> = new Set();

    register(store: Store<unknown>) {
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

    pop(): DependencyTracker | undefined {
        return this.trackers.pop();
    }

    register(store: Store<unknown>) {
        if (this.trackers.length === 0) {
            return;
        }
        this.trackers[this.trackers.length - 1].register(store);
    }
}

const effectTrackerContext = new DependencyTrackerContext();

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

    freeze() {
        this.forzen = true;
    }

    thaw() {
        this.forzen = false;
        if (this.markedForRun) {
            this.markedForRun = false;
            this.run();
        }
    }

    run() {
        if (this.cleanup) {
            this.cleanup();
            this.cleanup = undefined;
        }
        const tracker = effectTrackerContext.push();
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
            effectTrackerContext.pop();
        }
    }

    unsubscribe() {
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

export const useStore = <T>(store: Store<T>): T => {
    return React.useSyncExternalStore(
        (subs: Subscriber) => store.subscribe(subs),
        () => store.get()
    );
};

export const useNewStore = <T>(fn: () => T): StoreImpl<T> => {
    const [state] = useState(() => new StoreImpl(fn()));
    return state;
};
