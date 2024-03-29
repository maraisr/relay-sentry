<div align="right">

<samp>

# relay-sentry

</samp>

**Relay log function that enriches Sentry with Relay lifecycle's and GraphQL data**

<br />

<sup>

<a href="https://github.com/maraisr/relay-sentry/actions/workflows/ci.yml">
	<img src="https://github.com/maraisr/relay-sentry/actions/workflows/ci.yml/badge.svg"/>
</a>
<a href="https://licenses.dev/npm/relay-sentry">
  <img src="https://licenses.dev/b/npm/relay-sentry?style=dark" alt="licenses" />
</a>
<a href="https://npm-stat.com/charts.html?package=relay-sentry">
	<img src="https://badgen.net/npm/dw/relay-sentry?labelColor=black&color=black&cache=600" alt="downloads"/>
</a>
<a href="https://packagephobia.com/result?p=relay-sentry">
	<img src="https://badgen.net/packagephobia/install/relay-sentry?labelColor=black&color=black" alt="size"/>
</a>
<a href="https://bundlephobia.com/result?p=relay-sentry">
	<img src="https://badgen.net/bundlephobia/minzip/relay-sentry?labelColor=black&color=black" alt="size"/>
</a>

</sup>

</div>

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

If you want to also include the [GraphQL `errors` array](http://spec.graphql.org/draft/#sec-Errors) to the Sentry
exception context. You can throw a _ custom_ `Error` class that contains a property called `graphqlErrors`. Internally
we look for that key on the error object, and send it.

Under the hood it uses `@sentry/minimal` so there is no discrepancy between Node/Browser runtimes.

<details>
<summary>TypeScript users, we export an interface to help:</summary>

```ts
import type { ErrorWithGraphQLErrors } from 'relay-sentry';

declare global {
  interface Error extends ErrorWithGraphQLErrors {}
}
```

</details>

## 🎢 What does it look like?

![breadcrumbs](assets/breadcrumbs.jpg)

Leaves a debug/info breadcrumb trail for all intermediate life cycle events.

> At this stage it doesn't filter any variables, but if there's a need for it—submit a PR 🕺

## 🔎 API

### `logFunction(options?: Options): LogFunction`

`Options`

| Option                                           | Description                                        | Default     |
| ------------------------------------------------ | -------------------------------------------------- | ----------- |
| `filterEvents?: (logEvent: LogEvent) => boolean` | Use to filter log events from creating breadcrumbs | `undefined` |

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
<summary>The error's context looks like <code>[ [Object] ]</code></summary>

When you're running `Sentry.init` set the
[`normalizeDepth`](https://docs.sentry.io/platforms/javascript/configuration/options/#normalize-depth) to something
bigger, maybe 10.

</details>

<details>
<summary>My fetchFn is throwing an exception but it isn't appearing in Sentry?</summary>

`relay-sentry` used to also manually capture an exception thorough the `captureException` Sentry api. However, through
user feedback and further exploration we found it best to leave that to the consumer through the use of an
[async-boundary](https://github.com/maraisr/async-boundary) or alike. This avoided the double error emission (or event)
for an error that would have also been emitted by those boundaries.

</details>

## License

MIT © [Marais Rossouw](https://marais.io)
