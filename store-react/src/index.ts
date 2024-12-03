import React, { useState } from "react";
import { store, type Store, type Subscriber } from "store";

export const useStore = <T>(store: Store<T>): T => {
	return React.useSyncExternalStore(
		(subs: Subscriber) => store.subscribe(subs),
		() => store.get(),
	);
};

export const useNewStore = <T>(fn: () => T): Store<T> => {
	const [state] = useState(() => store(fn()));
	return state;
};
