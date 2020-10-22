import type { Breadcrumb } from '@sentry/node';
import { configureScope, getCurrentHub, init, Status } from '@sentry/node';
import type { Event, Transport } from '@sentry/types';
import { createOperationDescriptor } from 'relay-runtime';
import { createMockEnvironment } from 'relay-test-utils';
import { generateAndCompile } from 'relay-test-utils-internal/lib/TestCompiler';
import { suite } from 'uvu';
import * as assert from 'uvu/assert';

import * as relaySentry from '../src';

declare global {
	interface Error extends relaySentry.ErrorWithGraphQLErrors {}
}

const breadCrumbFormatter = (crumb: Breadcrumb): string =>
	`${crumb.type} (${crumb.level}) | ${crumb.category} | ${JSON.stringify(
		crumb.data,
	)}`;

const environment = createMockEnvironment({
	// @ts-ignore
	log: relaySentry.logFunction(),
});

let reports: Array<Event> = [];

const logFunction = suite('logFunction');

logFunction.before(() => {
	init({
		dsn: 'https://acacaeaccacacacabcaacdacdacadaca@sentry.io/000001',
		transport: class implements Transport {
			sendEvent(event: Event) {
				reports.push(event);
				return Promise.resolve({
					status: Status.Success,
				});
			}

			close() {
				return Promise.resolve(true);
			}
		},
		normalizeDepth: 10,
		defaultIntegrations: false,
	});
});

logFunction.before.each(() => {
	configureScope((scope) => {
		scope.clear();
	});

	environment.mock.clearCache();
	reports = [];
});

logFunction('logFunction', () => {
	assert.type(relaySentry.logFunction, 'function', 'exports a function');
	assert.type(
		relaySentry.logFunction(),
		'function',
		'exports a curried function',
	);
});

logFunction('execute', async () => {
	const { MyQuery } = generateAndCompile(
		`query MyQuery($something: Boolean!) { me @include(if: $something) { name } }`,
	);

	const environment = createMockEnvironment({
		// @ts-ignore
		log: relaySentry.logFunction(),
	});

	const req = environment
		.execute({
			operation: createOperationDescriptor(MyQuery, { something: true }),
		})
		.toPromise();
	environment.mock.resolveMostRecentOperation({
		data: { me: { id: 'test-id', name: 'test' } },
	});
	await req;

	// @ts-ignore
	const crumbs = getCurrentHub().getScope()._breadcrumbs;
	assert.is(Array.isArray(crumbs), true);

	assert.snapshot(
		crumbs
			.map((i) => breadCrumbFormatter(i))
			.join('\n')
			.toString(),
		`info (info) | relay.execute.start | {"transactionID":100000,"id":"77d0bff0563d7c4e8753ad3a6b219c1e","kind":"query","name":"MyQuery","variables":{"something":true}}
debug (debug) | relay.execute.next | {"transactionID":100000}
debug (debug) | relay.execute.complete | {"transactionID":100000}`,
	);
});

logFunction('execute.error', async () => {
	const { MyQuery } = generateAndCompile(
		`query MyQuery($something: Boolean!) { me @include(if: $something) { name } }`,
	);

	let req;
	try {
		req = environment
			.execute({
				operation: createOperationDescriptor(MyQuery, {
					something: true,
				}),
			})
			.toPromise();
		const error = new Error('test relay error');
		error.graphqlErrors = [
			{
				message: 'some remote error',
				path: ['MyQuery', 'me', 'name'],
			},
		];
		environment.mock.rejectMostRecentOperation(error);
		await req;
	} catch (e) {
		// nothing
	}

	await getCurrentHub().getStackTop().client.flush(0);

	assert.is(Array.isArray(reports), true);
	assert.is(reports.length, 1);

	const [error] = reports;
	assert.is('relay' in error.contexts, true, 'expects a relay context');

	assert.equal(
		error.tags,
		{ 'data.client': 'relay' },
		'expects the data.client sentry tag',
	);

	assert.snapshot(
		error.breadcrumbs
			.map((i) => breadCrumbFormatter(i))
			.join('\n')
			.toString(),
		`info (info) | relay.execute.start | {"transactionID":100001,"id":"77d0bff0563d7c4e8753ad3a6b219c1e","kind":"query","name":"MyQuery","variables":{"something":true}}`,
	);

	assert.equal(error.contexts.relay, {
		transactionID: 100001,
		name: 'execute.error',
		errors: [
			{
				message: 'some remote error',
				path: ['MyQuery', 'me', 'name'],
			},
		],
	});
});

// To truely test the logger does its job correctly we'd need to bootstrap React—so we're just going to mock
logFunction('queryresource', () => {
	relaySentry.logFunction()({
		name: 'queryresource.fetch',
		fetchPolicy: 'network-only',
		operation: {
			request: {
				node: {
					// @ts-ignore
					params: {
						operationKind: 'query',
						name: 'MyQuery',
						id: '123',
					},
				},
				variables: { something: true },
			},
		},
		queryAvailability: { status: 'missing' },
		shouldFetch: true,
		renderPolicy: 'partial',
	});

	// @ts-ignore
	const crumbs = getCurrentHub().getScope()._breadcrumbs;
	assert.is(Array.isArray(crumbs), true);

	assert.snapshot(
		crumbs
			.map((i) => breadCrumbFormatter(i))
			.join('\n')
			.toString(),
		`info (info) | relay.queryresource.fetch | {"id":"123","kind":"query","name":"MyQuery","variables":{"something":true},"shouldFetch":"yes","fetchPolicy":"network-only","renderPolicy":"partial","queryAvailability":{"status":"missing"}}`,
	);
});

logFunction.run();
