# Show available recipes.
default:
    @just --list

# Build and test all discovered example programs.
all: build test

# Build all discovered example programs.
build:
    #!/usr/bin/env sh
    set -eu
    : "${RUSTFLAGS:=-D warnings}"
    export RUSTFLAGS

    manifests="$(find . -mindepth 2 -maxdepth 2 -name Quasar.toml -print | LC_ALL=C sort)"

    if [ -z "$manifests" ]; then
      echo "No example programs found."
      exit 1
    fi

    printf '%s\n' "$manifests" | while IFS= read -r manifest; do
      program="${manifest#./}"
      program="${program%/Quasar.toml}"
      echo "==> quasar build: $program"
      (cd "$program" && quasar build)
    done

# Build one example program by directory name.
build-one program:
    #!/usr/bin/env sh
    set -eu
    : "${RUSTFLAGS:=-D warnings}"
    export RUSTFLAGS

    if [ ! -f "{{program}}/Quasar.toml" ]; then
      echo "Unknown example program: {{program}}"
      exit 1
    fi

    echo "==> quasar build: {{program}}"
    cd "{{program}}"
    quasar build

# List discovered example programs.
programs:
    #!/usr/bin/env sh
    set -eu

    manifests="$(find . -mindepth 2 -maxdepth 2 -name Quasar.toml -print | LC_ALL=C sort)"

    if [ -z "$manifests" ]; then
      echo "No example programs found."
      exit 1
    fi

    printf '%s\n' "$manifests" | while IFS= read -r manifest; do
      program="${manifest#./}"
      program="${program%/Quasar.toml}"
      echo "$program"
    done

# Test all discovered example programs.
test:
    #!/usr/bin/env sh
    set -eu
    : "${RUSTFLAGS:=-D warnings}"
    export RUSTFLAGS

    manifests="$(find . -mindepth 2 -maxdepth 2 -name Quasar.toml -print | LC_ALL=C sort)"

    if [ -z "$manifests" ]; then
      echo "No example programs found."
      exit 1
    fi

    printf '%s\n' "$manifests" | while IFS= read -r manifest; do
      program="${manifest#./}"
      program="${program%/Quasar.toml}"
      echo "==> quasar test: $program"
      (cd "$program" && quasar test)
    done

# Test one example program by directory name.
test-one program:
    #!/usr/bin/env sh
    set -eu
    : "${RUSTFLAGS:=-D warnings}"
    export RUSTFLAGS

    if [ ! -f "{{program}}/Quasar.toml" ]; then
      echo "Unknown example program: {{program}}"
      exit 1
    fi

    echo "==> quasar test: {{program}}"
    cd "{{program}}"
    quasar test
