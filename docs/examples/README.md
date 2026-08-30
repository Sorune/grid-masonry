# Compile-checked examples

`core-capabilities.ts` is a small source-level TypeScript fixture covering the
final Core contracts. It is checked from the repository with the same
TypeScript toolchain; it is not a package runtime test and is not published as
an example artifact.

The React and Browser guides intentionally keep JSX/DOM examples focused on
their actual exported components and options. Their package declarations are
checked by the normal package type fixtures.
