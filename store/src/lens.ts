import { dependencyTrackerContext } from "./effect";
import {
	isUpdateable,
	type Store,
	type Subscriber,
	type Unsubscriber,
	type Update,
	type Write,
} from "./store";

export function lens<T, U>(store: Store<T>, getter: (state: T) => U): Store<U>;

export function lens<T, U>(
	store: Store<T> & Update<T>,
	getter: (state: T) => U,
): Store<U> & Update<U>;

export function lens<T, U>(
	store: Store<T> & Update<T>,
	getter: (state: T) => U,
	setter: (state: T, newValue: U) => void,
): Store<U> & Write<U> & Update<U>;

export function lens<T, U>(
	store: Store<T> | (Store<T> & Update<T>),
	getter: (state: T) => U,
	setter?: (state: T, newValue: U) => void,
): Store<U> | (Store<U> & Update<U>) | (Store<U> & Update<U> & Write<U>) {
	if (isUpdateable(store)) {
		if (setter) {
			return new LensWithSet(store, getter, setter);
		}
		return new UpdateableLens(store, getter);
	}
	return new ReadOnlyLens(store, getter);
}

class ReadOnlyLens<T, U> implements Store<U> {
	private subscribers: Set<Subscriber> = new Set();
	private lastValue: U;
	private unsubscribeParent: Unsubscriber | null = null;

	constructor(
		protected parent: Store<T>,
		protected lens: (_: T) => U,
	) {
		this.lastValue = this.lens(parent.get());
	}

	get(): U {
		dependencyTrackerContext.register(this);
		return this.lastValue;
	}

	subscribe(subscriber: Subscriber): Unsubscriber {
		if (this.subscribers.size === 0) {
			this.unsubscribeParent = this.parent.subscribe(() =>
				this._onParentChange(),
			);
		}
		this.subscribers.add(subscriber);
		return () => {
			this.subscribers.delete(subscriber);
			if (this.subscribers.size === 0 && this.unsubscribeParent) {
				this.unsubscribeParent();
			}
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

export class UpdateableLens<T, U>
	extends ReadOnlyLens<T, U>
	implements Store<U>, Update<U>
{
	constructor(
		protected parent: Store<T> & Update<T>,
		lens: (_: T) => U,
	) {
		super(parent, lens);
	}

	update(fn: (state: U) => void): void {
		this.parent.update((state) => {
			const u = this.lens(state);
			fn(u);
		});
	}
}

class LensWithSet<T, U> extends UpdateableLens<T, U> implements Write<U> {
	constructor(
		parent: Store<T> & Update<T>,
		getter: (_: T) => U,
		private setter: (_: T, newValue: U) => void,
	) {
		super(parent, getter);
	}

	set(newState: U): void {
		this.parent.update((state) => {
			this.setter(state, newState);
		});
	}
}
