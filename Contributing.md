# Contributing

## Repository layout
- `lean/`: Lean 4 formal models and executable tests.
- `docs/`: architecture and notebook documentation.
- `workers/`: legacy/new worker implementations.
- `scripts/`: automation and tooling helpers.
- `data/`: static data manifests and reference files.

## Development
1. Install Lean toolchain from `lean-toolchain`.
2. Run `scripts/lake_build.sh` to build Lean artifacts.
3. Run project tests relevant to your area before opening a PR.

## Pull requests
- Keep changes focused and scoped.
- Include test output in the PR description.
- Avoid re-introducing root-level clutter files.
