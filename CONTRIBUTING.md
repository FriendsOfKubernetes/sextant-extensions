# Adding an extension to the catalog

An entry is one file, `extensions/<id>.json`, added by a pull request. Before you open it, publish a release of your extension (the steps are below). The workflow checks the entry and that release on the pull request.

## 1. Make a signing key, once

With Sextant's SDK, from a checkout of [FriendsOfKubernetes/sextant](https://github.com/FriendsOfKubernetes/sextant):

```bash
npm run sdk:keygen -- my-extension --out ~/keys
```

This writes `my-extension.pub` (public) and `my-extension.key` (secret), and prints the line that goes into your entry as `publisherKey`. Any minisign tool works too: `minisign -G`, `rsign generate`. Set the variable `--password-env` names to encrypt the secret key. A key without a password belongs only in a secret store, such as a GitHub Actions secret.

Keep the secret key. If you lose it, only a reviewed pull request can change your entry's key, and your users have to install the extension again to trust the new one.

## 2. Publish a release

1. Build and pack the extension: `npm run sdk:build -- <project>`, then `npm run sdk:pack -- <project>/dist`. This writes `<id>-<version>.sextant-ext`, with a plain `X.Y.Z` version.
2. Sign the package: `npm run sdk:sign -- <id>-<version>.sextant-ext --key ~/keys/my-extension.key`. This writes `<id>-<version>.sextant-ext.minisig`.
3. Create a GitHub release in your extension's public repository, and attach both files. Make it neither a draft nor a pre-release. The tag may use letters, digits and `. _ + -`, and no `/`.

The catalog lists your newest release that has both files and passes the checks. Later releases are picked up automatically, once a day; nothing has to change in this repository.

## 3. Open the pull request

Add `extensions/<id>.json`:

```json
{
  "id": "acme.quota-board",
  "name": "Quota board",
  "author": "Acme",
  "description": "Namespace quotas and what uses them, at a glance.",
  "categories": ["cost"],
  "repository": "acme/sextant-quota-board",
  "publisherKey": "RWQ…"
}
```

- `id`, `name` and `author` are as in your manifest; `name` is 1–80 characters.
- `description` is 1–500 characters of plain text in English.
- `categories` lists 1 to 3 of: observability, cost, security, gitops, networking, storage, workloads, developer, other.
- `repository` is `<owner>/<repository>` on GitHub, where your releases are.
- `publisherKey` is the base64 line of your public key alone.

## What reviewers check

- The repository is public, has a license and holds the extension's source.
- The entry is truthful: its name and description match what the extension does, and it does not imitate another project or organization.
- Each permission the extension asks for is explained in the pull request, and none is broader than needed. An extension that asks for Secret values or for Modify/Delete everywhere needs a reason a reviewer agrees with.
- The workflow's check passes: the release is signed with the entry's key, and its manifest matches the entry.

The review is of the entry, the publisher and the permissions, not of every release's code. A later release that asks for more permissions brings Sextant's consent screen back on every user's machine.

## Changing or withdrawing an entry

- A new key or repository needs a pull request that explains why. Users who installed from the old one keep it, and Sextant refuses their updates until they install again.
- A pull request may add `"withdrawn": { "reason": "…" }` to an entry, for example for a known-bad package. Sextant then no longer offers the extension, and shows the reason to those who have it installed. It never disables or removes anything itself.
