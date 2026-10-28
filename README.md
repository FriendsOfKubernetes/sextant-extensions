# Sextant extension catalog

The catalog of extensions for [Sextant](https://github.com/FriendsOfKubernetes/sextant), the free Kubernetes desktop client. Sextant reads `index.json` from this repository and shows it under Settings → Extensions → Catalog. The design is in [ADR-0130](https://github.com/FriendsOfKubernetes/sextant/blob/main/docs/adr/0130-extensions-from-a-catalog-one-index-at-a-fixed-url-packages-from-the-publishers-github-releases-signed-with-the-key-the-index-pins.md).

> **Status:** being built for Sextant 0.26.0 ([#271](https://github.com/FriendsOfKubernetes/sextant/issues/271)). The index is empty for now. To add an extension, see [CONTRIBUTING.md](CONTRIBUTING.md).

## How it works

- Each extension is one reviewed file, `extensions/<id>.json`. It names the extension, its GitHub repository and the publisher's [minisign](https://jedisct1.github.io/minisign/) public key.
- A workflow of this repository writes `index.json`; nobody edits it by hand. For each entry it reads the newest release of the publisher's repository, verifies the signature of `<id>-<version>.sextant-ext` with the entry's key, checks the manifest, and records the version, size, SHA-256 and the permissions the extension asks for.
- Sextant downloads the package from the publisher's release and verifies the size, the SHA-256 and the signature itself before it shows the usual consent screen. The publisher's key is pinned at install: an update signed with another key is refused.

## What the catalog does and does not promise

The catalog tells you who publishes an extension and that the package you install is theirs. It does not audit the code of every release. What an extension can do is limited by Sextant's sandbox and by the permissions you grant on the consent screen.

## License

MIT or Apache License 2.0, as Sextant: [LICENSE-MIT](LICENSE-MIT), [LICENSE-APACHE](LICENSE-APACHE).
