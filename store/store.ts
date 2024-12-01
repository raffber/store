import { create } from "mutative";
import type { ExternalOptions } from "mutative/dist/interface.js";
import { effectTrackerContext } from "./effect";

export type Subscriber = () => void;
export type Unsubscriber = () => void;

export interface Store<T> {
    subscribe(subscriber: Subscriber): Unsubscriber;
    get(): T;
}

export interface Write<T> {
    set(newState: T): void;
}

export interface Update<T> {
    update(fn: (state: T) => void): void;
}

export const store: <T>(initalState: T) => Store<T> & Write<T> & Update<T> = <T>(
    initialState: T
) => {
    return new StoreImpl(initialState);
};

export type UpdateableStore<T> = Store<T> & Update<T>;

export type WritableStore<T> = Store<T> & Write<T> & Update<T>;


export function lens<T, U>(store: Store<T>, getter: (state: T) => U): Store<U>
export function lens<T, U>(store: Store<T> & Update<T>, getter: (state: T) => U): Store<U> & Update<U>
export function lens<T, U>(store: Store<T> & Update<T>, getter: (state: T) => U, setter: (state: T, newValue: U) => void): Store<U> & Write<U> & Update<U>


export function lens<T, U>(store: Store<T> | Store<T> & Update<T>, getter: (state: T) => U, setter?: (state: T, newValue: U) => void): Store<U> | Store<U> & Update<U> | Store<U> & Update<U> & Write<U> {
    if (isUpdateable(store) && setter) {
        if (setter) {
            return new LensWithSet(store, getter, setter);
        } else {
            return new UpdateableLens(store, getter);
        }
    }
    return new ReadOnlyLens(store, getter);
}


function isUpdateable<T>(store: Store<T> | Store<T> & Write<T>): store is Store<T> & Update<T> {
    return (store as Store<T> & Update<T>).update !== undefined;
}

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
                if (target instanceof UpdateableLens) {
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


class ReadOnlyLens<T, U> implements Store<U> {
    private subscribers: Set<Subscriber> = new Set();
    private lastValue: U;

    constructor(
        protected parent: Store<T>,
        private lens: (_: T) => U
    ) {
        this.lastValue = this.lens(parent.get());
        this.parent.subscribe(() => this._onParentChange());
    }

    get(): U {
        return this.lastValue;
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
}


class UpdateableLens<T, U> implements Store<U>, Update<U> {
    private subscribers: Set<Subscriber> = new Set();
    private lastValue: U;

    constructor(
        protected parent: Store<T> & Update<T>,
        private lens: (_: T) => U
    ) {
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
}

class LensWithSet<T, U> extends UpdateableLens<T, U> implements Write<U> {
    constructor(
        parent: Store<T> & Update<T>,
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
