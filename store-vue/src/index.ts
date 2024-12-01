import { ref, watch, type WatchSource } from "vue";
import { effect, type Store } from "@raffber/store";

export default function useStore<T>(store: Store<T>): T {
	const changed = ref(0);
	watch(
		() => store,
		(_store, _oldStore, onCleanup) => {
			const unsubscribe = store.subscribe(() => {
				changed.value++;
			});

			onCleanup(unsubscribe);
		},
		{ immediate: true },
	);
	return store.get();
}

export function useStoreEffect<T>(
	fn: () => void,
	source?: WatchSource<unknown> | WatchSource<unknown>[],
): void {
	let actualSource = source;
	if (!actualSource) {
		actualSource = () => {};
	}
	watch(
		actualSource,
		(_new, _old, onCleanup) => {
			const eff = effect(fn);
			onCleanup(() => eff.stop());
		},
		{ immediate: true },
	);
}
