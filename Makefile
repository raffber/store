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
	cd $(curdir)/store-vue
	pnpm run build
	cd $(curdir)/store-angular
	pnpm run build


format: ## Format all projects
	cd $(curdir)
	npx biome format --write \
		store/src  			\
		store-react/src  	\
		store-vue/src 		\
		store-angular/src


.PHONY: clean
clean: ## Clean out all generated files
	cd $(curdir)
	rm -rf node_modules
	rm -rf store/node_modules
	rm -rf store/dist
	rm -rf store-react/node_modules
	rm -rf store-react/dist
	rm -rf store-vue/node_modules
	rm -rf store-vue/dist
	rm -rf store-angular/node_modules
	rm -rf store-angular/dist


.PHONY: pack
pack: build ## Pack all projects
	cd $(curdir)/store
	pnpm pack --pack-destination dist

	cd $(curdir)/store-react
	pnpm pack --pack-destination dist

	cd $(curdir)/store-vue
	pnpm pack --pack-destination dist

	cd $(curdir)/store-angular
	pnpm pack --pack-destination dist

	cd $(curdir)
	mkdir -p dist
	find store/dist -name "*.tgz" -exec mv {} dist \;
	find store-react/dist -name "*.tgz" -exec mv {} dist \;
	find store-vue/dist -name "*.tgz" -exec mv {} dist \;
	find store-angular/dist -name "*.tgz" -exec mv {} dist \;


.PHONY: test
test: build ## Run all tests
	cd $(curdir)/store
	pnpm run test


.PHONY: login
login: ## Login to GitHub Package Registry
	@cd $(curdir)
	if [ -z $${GITHUB_TOKEN+x} ]; then
		if [[ ! -f .env ]]; then
			echo "Missing .env file"
			exit 1
		fi
		. .env
		if [ -z $${GITHUB_TOKEN+x} ]; then
			echo "Missing GITHUB_TOKEN in .env file"
			exit 1
		fi
	fi
	npm config set -- //npm.pkg.github.com/:_authToken=$$GITHUB_TOKEN


.PHONY: publish
publish: ## Publish all packages
	cd $(curdir)/store
	pnpm publish
	cd $(curdir)/store-react
	pnpm publish


.PHONY: set-version
set-version: ## Set version for all projects
	cd $(curdir)
	version=$$(cat package.json | jq -r '.version')
	echo "Setting version to $$version"
	cd $(curdir)/store
	pnpm version $$version
	cd $(curdir)/store-react
	pnpm version $$version
	cd $(curdir)/store-vue
	pnpm version $$version
	cd $(curdir)/store-angular
	pnpm version $$version
