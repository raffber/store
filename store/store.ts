import { create } from "mutative";
import type { ExternalOptions } from "mutative/dist/interface.js";
import { dependencyTrackerContext } from "./effect";
import { UpdateableLens } from "./lens";

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

export const store: <T>(initalState: T) => Store<T> & Write<T> & Update<T> = <
	T,
>(
	initialState: T,
) => {
	return new StoreImpl(initialState);
};

export type UpdateableStore<T> = Store<T> & Update<T>;

export type WritableStore<T> = Store<T> & Write<T> & Update<T>;

export function isUpdateable<T>(
	store: Store<T> | (Store<T> & Write<T>),
): store is Store<T> & Update<T> {
	return (store as Store<T> & Update<T>).update !== undefined;
}

class StoreImpl<T> implements Store<T>, Write<T>, Update<T> {
	private _state: T;
	private subscribers: Set<Subscriber>;
	private _recursiveId = 0;

	constructor(initialState: T) {
		this._state = initialState;
		this.subscribers = new Set();
	}

	get(): T {
		dependencyTrackerContext.register(this);
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
