# Signing keys

`sextant-extensions.pub` is the public minisign key of Sextant's own extensions: the ones whose source is in
[`extensions/`](https://github.com/FriendsOfKubernetes/sextant/tree/main/extensions) of the Sextant repository and
whose releases this repository publishes (see the **Release a Sextant extension** workflow). Their catalog entries
pin it as `publisherKey`.

The secret key is only in this repository's Actions secret `SEXTANT_EXTENSIONS_SIGNING_KEY` and with the maintainers.
