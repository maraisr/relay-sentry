import type { GraphQLFormattedError } from 'graphql';
import type { PayloadError } from 'relay-runtime';
import type {
	LogEvent,
	LogFunction,
} from 'relay-runtime/lib/store/RelayStoreTypes';

export interface Options {
	/**
	 * Use this function to filter events that you do not wish to emit as breadcrumbs. Perhaps you don't get when the
	 * store did a garbage collection, so you can use this to filter that. The idea here is to keep this method pure, so
	 * please don't use this to log things 😅
	 *
	 * Return `true` for the event not to be included.
	 *
	 * @example
	 *
	 * ```js
	 * logFunction({
	 *  filterEvents(logEvent) {
	 *      // Don't include store.gc events
	 *      return logEvent.name !== "store.gc";
	 *  }
	 * })
	 * ```
	 */
	filterEvents?: (logEvent: LogEvent) => boolean;
}

export interface ErrorWithGraphQLErrors extends Error {
	graphqlErrors?: ReadonlyArray<GraphQLFormattedError | PayloadError>;
}

/**
 * Runs on every Relay life cycle stages, passing through some context for this function to _react_ upon. Through this
 * you can pass an _optional_ {@link Options} to set some properties that get emitted to Sentry.
 */
export function logFunction(options?: Options): LogFunction;
