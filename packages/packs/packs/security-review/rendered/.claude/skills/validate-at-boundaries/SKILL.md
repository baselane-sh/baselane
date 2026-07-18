---
name: validate-at-boundaries
description: Use when code receives data from outside its own module — user input, API responses, file contents, env vars, message payloads — validate it against a schema at the boundary and fail fast, so untrusted shapes never propagate inward.
---

# Validate at boundaries

Every place external data enters your system is a boundary: an HTTP handler, a file read, an API
response, an environment variable, a queue message. **Validate at the boundary, before the data
reaches any logic that assumes it is well-formed.** Inside the boundary, the value is trusted because
you already checked it — not because you hope it is right.

```ts
// At the boundary: parse into a known shape, or reject.
const parsed = OrderSchema.parse(await req.json()); // throws on bad shape
createOrder(parsed);                                 // inner code trusts `parsed`
```

## Rules

- **One validator is the authority for each shape.** Route every entry point for that shape through
  it — built-in, user-supplied, or machine-generated. Never hand-construct or trust an unvalidated
  object further in.
- **Fail fast, name the field.** Reject the whole input on the first violation with a message that
  says which field was wrong and why. A vague "invalid input" costs the caller a debugging session.
- **Parse, don't just check.** Return a typed value from validation so downstream code carries the
  guarantee in its types, not just in a comment.
- **Never trust "internal" data blindly.** An API response or a sibling service's payload is external
  to your module even if it's inside your company — validate it the same way.

## Why

Unvalidated data that flows inward turns a boundary problem into a deep-stack mystery: the crash
happens three layers down, far from the malformed input that caused it. Validation at the edge keeps
the failure where the bad data actually entered, where the error message can still be specific.

## Boundaries to cover

HTTP request bodies and query params · file and config contents · third-party API responses ·
environment variables (validate presence and format at startup) · deserialized messages/events ·
anything read from a store you did not just write in the same transaction.
