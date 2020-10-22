# `relay-sentry` [![CI](https://img.shields.io/github/workflow/status/maraisr/relay-sentry/CI/main)](https://github.com/maraisr/relay-sentry/actions?query=workflow:CI+branch:main) [![codecov](https://badgen.net/codecov/c/github/maraisr/relay-sentry)](https://codecov.io/gh/maraisr/relay-sentry)

> Relay log function that enriches Sentry with Relay lifecycles and GraphQL data

## ⚙️ Install

```sh
yarn add relay-sentry
```

## 🧱 Usage

```ts
import { logFunction } from 'relay-sentry';
import { Environment } from 'relay-runtime';

const environment = new Environment({
	log: logFunction(),
	network,
	store,
});
```

If you're wanting to also include the
[GraphQL `errors` array](http://spec.graphql.org/draft/#sec-Errors) to the
Sentry exception context. You can throw a _custom_ `Error` class that contains a
property called `graphqlErrors`. Internally we look for that key on the error
object, and send it.

<details>
<summary>We include the global property for TypeScript users.</summary>

```ts
declare global {
	interface Error {
		graphqlErrors?: ReadonlyArray<GraphQLFormattedError>;
	}
}
```

</details>

## 🔎 API

### `logFunction(options?: Options): LogFunction`

### `Options`

| Option        | Description                                  | Default         |
| ------------- | -------------------------------------------- | --------------- |
| `tag: string` | The tag key used when raising a Sentry error | `"data.client"` |

## ⁉ Help

<details>
<summary>How can I log something custom?</summary>

```ts
import { logFunction } from 'relay-sentry';
import { Environment } from 'relay-runtime';

const environment = new Environment({
	log: (logEvent) => {
		logFunction(logEvent);
		// Do your logs
	},
	network,
	store,
});
```

</details>

<details>
<summary>The error's context looks like `[ [Object] ]`</summary>

When you're running `Sentry.init` set the
[`normalizeDepth`](https://docs.sentry.io/platforms/javascript/configuration/options/#normalize-depth)
to something bigger, maybe 10.

</details>

## License

MIT © [Marais Rossouw](https://marais.io)
