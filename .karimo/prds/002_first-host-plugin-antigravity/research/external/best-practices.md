# External Best Practices - Antigravity Host Plugin

## Best Practices

### 1. Standard Node.js HTTP Server Implementation
* Avoid third-party HTTP framework dependencies (like Express, Koa) for lightweight local plugins. Use standard `http` module.
* Read incoming data stream chunks safely and parse JSON on complete transmission.
* Close connections and exit cleanly on SIGTERM/SIGINT.

### 2. Orca Webhook Handling
* Webhook requests sent to `/hook/antigravity` must receive a standard response (e.g., status 200) within the timeout window (2 seconds as defined in the powershell command).
* Handle requests asynchronously so that slow validation or execution tracing doesn't block the HTTP request acknowledgment.
