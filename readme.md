# `relay-sentry` [![CI](https://img.shields.io/github/workflow/status/maraisr/relay-sentry/CI/main)](https://github.com/maraisr/relay-sentry/actions?query=workflow:CI+branch:main) [![codecov](https://badgen.net/codecov/c/github/maraisr/relay-sentry)](https://codecov.io/gh/maraisr/relay-sentry)

> Relay log function that enriches Sentry with Relay lifecycles and GraphQL data

STUFF

## ⚙️ Install

```sh
yarn add relay-sentry
```

## 🧱 Usage

```ts
import { logFunction } from 'relay-sentry';
import { Environment } from 'relay-runtime';

// For when you want to log  your own things
const myLogFunction = (logEvent) => {
	console.log(logEvent.name);
};

const environment = new Environment({
	log: logFunction(myLogFunction),
	network,
	store,
});
```

## 🔎 API

## License

MIT © [Marais Rossouw](https://marais.io)
