import { ChangeDetectorRef, DestroyRef, inject } from "@angular/core";
import type { Store } from "@raffber/store";

export function injectStore<T>(store: Store<T>): T {
	const changeDetector = inject(ChangeDetectorRef);
	const destroyRef = inject(DestroyRef);

	const unsubscribe = store.subscribe(() => {
		changeDetector.markForCheck();
	});

	destroyRef.onDestroy(() => {
		unsubscribe();
	});

	return store.get();
}
