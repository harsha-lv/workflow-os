# Integrations

Integrations are adapters.

AI:

- Interface: `AIProvider.complete`
- SpaceXAI (`xai`) uses the OpenAI-compatible SDK against `https://api.x.ai/v1`
- OpenAI can reuse the same client with a different base URL
- Anthropic and Gemini are listed and gated on env keys; adding a real client is a new file under `src/domain/ai/`
- Mock provider is automatic when no key exists. Outputs include `mocked: true`

HTTP: generic `data.http` node.

Email: `comm.email` records an outbound action. Wire a provider adapter in the handler when a real transport is configured.

Secrets: AES-256-GCM, masked as `••••abcd` in the UI, decrypted only in the worker.

Never log secret values. Never send them to the client.
