import type { LogFunction } from 'relay-runtime/lib/store/RelayStoreTypes';

export const logFunction = (customLogger?: LogFunction): LogFunction => (
	logEvent,
) => {
	// Do stuff to Sentry

	customLogger?.(logEvent);
};
