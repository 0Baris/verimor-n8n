# Verimor n8n node

[Türkçe](README.md)

An independent community n8n node (`n8n-nodes-verimor`) for the Verimor SMS, Switch and WhatsApp APIs.

> This project is community-maintained and unofficial. It provides no support or compatibility guarantee on behalf of Verimor.
>
> This release is verified with offline tests; it has not been validated against the live Verimor services yet.

## Installation

In n8n, use **Settings → Community Nodes → Install** with `n8n-nodes-verimor`. Until the package is on npm, self-hosted n8n users can install the `.tgz` from the GitHub Release into `~/.n8n/nodes` with `npm install <file>.tgz`.

## Actions

| Resource | Action |
| --- | --- |
| SMS | Send, Get Balance, Get Status (by campaign ID or custom ID) |
| Switch | Originate Call |
| WhatsApp | Send OTP, Send Utility Message |
| Every product | Advanced: Raw Request — calls any of the product's 68 operations directly |

## Credentials

Each product has its own credential:

- **Verimor SMS API**: username, password, optional default sender (`source_addr`), base URL. Test: balance query.
- **Verimor Switch API**: API key, base URL. Test: queue list.
- **Verimor WhatsApp API**: API key (`x-api-key`), base URL. The test checks reachability only; WhatsApp has no authenticated endpoint without side effects.

Change the base URL only to point at a test server.

## Safety and cost

- Send actions create real messages or calls and may cost money. With n8n's **Retry On Fail** off the node never repeats a request; if you turn it on, the same message may go out more than once.
- Requests time out after 30 seconds.
- Error messages contain only the HTTP status and a response summary, never credentials or the request address.
- Advanced: Raw Request sends exactly the request you describe.

## Development

```bash
npm ci
npm run lint
npm test
sh scripts/test-consumer.sh
```

`nodes/Verimor/operations.gen.ts` is generated; do not edit it by hand.

## License

MIT. See [LICENSE](LICENSE).
