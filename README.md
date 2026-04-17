# quasar-examples

Collection of [Quasar](https://github.com/blueshift-gg/quasar) example programs.

Each top-level directory in this repo is a separate example program. The root `justfile` discovers programs automatically by looking for `Quasar.toml`.

## Prerequisites

- `git`
- `just`
- `bun`
- Rust and Cargo
- Agave / Solana CLI
- Quasar CLI

## Clone The Repo

```bash
git clone git@github.com:beeman/quasar-examples.git
cd quasar-examples
```

## Explore The Repo

Show the available root commands:

```bash
just
```

List the discovered example programs:

```bash
just programs
```

## Run Everything

Build every example program:

```bash
just build
```

Test every example program:

```bash
just test
```

Build and test every example program:

```bash
just all
```

## Run One Example

Build one example:

```bash
just build-one counter
```

Test one example:

```bash
just test-one counter
```

## Run A Program Directly

Example with the current `counter` program:

```bash
cd counter
bun install
quasar build
quasar test
```

`quasar build` generates the program artifact, IDL, and clients under `target/`.

## Adding More Examples

Add a new top-level directory with its own `Quasar.toml`, and it will be picked up automatically by:

- `just programs`
- `just build`
- `just test`
- the GitHub Actions workflow
