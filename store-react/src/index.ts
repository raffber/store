import React, {
	useState,
	type DependencyList,
	type EffectCallback,
} from "react";
import {
	effect,
	store,
	type Store,
	type Subscriber,
	type Update,
	type Write,
} from "@raffber/store";

export const useStore = <T>(store: Store<T>): T => {
	return React.useSyncExternalStore(
		(subs: Subscriber) => store.subscribe(subs),
		() => store.get(),
	);
};

export const useNewStore = <T>(
	fn: () => T,
): Store<T> & Write<T> & Update<T> => {
	const [state] = useState(() => store(fn()));
	return state;
};

export const useStoreEffect = <T>(
	fn: EffectCallback,
	deps?: DependencyList,
): void => {
	// biome-ignore lint/correctness/useExhaustiveDependencies: fn is the function passed to useEffect
	React.useEffect(() => {
		const eff = effect(fn);
		return () => eff.stop();
	}, deps);
};
