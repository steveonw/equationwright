# Security policy

## Supported code

Security reports should identify the affected application version, gateway
version, browser or operating system, and exact reproduction steps.

## Reporting

Do not publish working exploits, real student data, gateway keys, collector
URLs, or model-server credentials in a public issue. Contact the repository
owner privately first.

## Important boundaries

- Student-lock PIN links deter casual access; they are not exam-security tools.
- Result collector URLs should be treated as secrets when they permit writes.
- The gateway should bind to `127.0.0.1` unless the operator intentionally
  enables trusted-network access.
- Do not commit GGUF models, API keys, `gateway.json`, or student result files.
- AI output is advisory; deterministic grading remains the source of truth.
