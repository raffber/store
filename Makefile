SHELL := /bin/bash
.ONESHELL:
.SHELLFLAGS := -eufo pipefail -c

curdir = $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
projdir = $(shell git rev-parse --show-toplevel)

.PHONY: help
help:
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)


.PHONY: install
install: ## Install all dependencies
	cd $(curdir)
	pnpm install


.PHONY: build
build: ## Build all projects
	cd $(curdir)/store
	pnpm run build
	cd $(curdir)/store-react
	pnpm run build


format: ## Format all projects
	npx biome format --write $(curdir)/store/src $(curdir)/store-react/src


.PHONY: clean
clean: ## Clean out all generated files
	cd $(curdir)
	rm -rf node_modules
	rm -rf store/node_modules
	rm -rf store/dist
	rm -rf store-react/node_modules
	rm -rf store-react/dist


.PHONY: pack
pack: build ## Pack all projects
	cd $(curdir)/store
	pnpm pack --pack-destination dist

	cd $(curdir)/store-react
	pnpm pack --pack-destination dist

	cd $(curdir)
	mkdir -p dist
	find store/dist -name "*.tgz" -exec mv {} dist \;
	find store-react/dist -name "*.tgz" -exec mv {} dist \;

.PHONY: test
test: build ## Run all tests
	cd $(curdir)/store
	pnpm run test
