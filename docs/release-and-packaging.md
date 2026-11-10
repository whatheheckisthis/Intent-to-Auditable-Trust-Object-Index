# Release and package publishing guide (planned)

This document describes a future publishing process for IATO. It does **not** create a release, tag, container image, or NuGet package. Publishing should wait until the corresponding application is buildable, tested, and documented as ready for distribution.

## Current readiness

The repository currently has Python policies, ingestion/collector prototypes, and a separate .NET Graph collector prototype under `dotnet/`. The .NET project is an executable prototype, not yet a supported reusable NuGet library. The Python CLI, IIQ parser, and .NET collector are not yet validated together as one complete production workflow.

Before publishing, verify the release contents and update this status. In particular:

- Run the policy and Python tests, and build/test the .NET project in CI.
- Confirm the .NET collector’s Graph request models, paging, error handling, and permissions against a test tenant.
- Confirm container builds and offline/live behavior separately. Offline runs can use `--network=none`; live Microsoft Graph runs require network access.
- Review package metadata, licensing, dependency versions, and security settings.
- Use sanitized test fixtures. Do not include production exports, generated snapshots, credentials, or certificates in artifacts.

## GitHub Release and source archives

When a release is approved, create a version tag from the reviewed release commit on the project’s release branch. Publish release notes that describe the project as a staged implementation if any end-to-end features remain incomplete. GitHub provides source `.zip` and `.tar.gz` archives for a release tag automatically.

Do not create a tag or publish a release as part of ordinary documentation or implementation work. Follow the repository’s release approval process before tagging.

## GHCR container images

The repository has separate container build definitions for the Python workflow and the .NET collector prototype. Decide which image is actually supported before enabling publishing. If publishing both, use distinct, clearly named image repositories so users do not mistake the .NET prototype for the integrated Python CLI.

A future GitHub Actions workflow should:

- Trigger on reviewed version tags (and optionally a manual dispatch), not every unreviewed feature-branch push.
- Grant only `contents: read` and `packages: write` permissions.
- Build the intended Containerfile with the correct build context.
- Authenticate to `ghcr.io` using the workflow `GITHUB_TOKEN` and publish versioned tags; `latest` should only be updated for an approved stable release.
- Avoid passing credentials into build arguments or image layers.
- Run build and security checks before publishing.

GHCR publication requires the workflow to have package write permission and the organization/repository package settings to allow it. No image is published by this guide.

## NuGet package

The current `dotnet/iato.csproj` is an executable (`OutputType` is `Exe`) and the code is a collector prototype. Do not publish it as a stable NuGet library until the public API, package purpose, versioning, license, and support status are deliberately defined. If the intention is to distribute a runnable application rather than a library, a container or .NET tool may be a better fit than a NuGet library package.

If a NuGet package is approved later:

1. Add and review package metadata, including package ID, version, authors, description, repository URL, license, and readme.
2. Run restore, build, and tests; inspect the generated `.nupkg` before publishing.
3. Store the NuGet API key as a protected GitHub Actions secret (for example `NUGET_API_KEY`) with the narrowest available scope.
4. Publish only from a reviewed version tag, and use `--skip-duplicate` only if that behavior is intended for retries.
5. Never place the API key in source, workflow logs, command-line literals, or package contents.

## Release checklist

- [ ] Release approval and target commit are confirmed.
- [ ] Tests and builds pass for all components being advertised.
- [ ] README and release notes accurately distinguish implemented features from roadmap items.
- [ ] No customer data, generated output, credentials, private keys, or certificates are included.
- [ ] Intended artifacts and package names are reviewed.
- [ ] Publishing workflows have least-privilege permissions and protected secrets.
- [ ] Tag and release are created only after approval.
- [ ] Published artifacts are verified and their digests recorded.
