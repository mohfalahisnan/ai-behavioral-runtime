# External Libraries - Antigravity Host Plugin

## Library Evaluations

### 1. Node.js native `http` module
* **Verdict**: Selected.
* **Rationale**: Zero external dependencies, fast startup, lightweight footprint, and built directly into standard Node.js runtime environment.

### 2. Express.js
* **Verdict**: Rejected.
* **Rationale**: Unnecessary dependency overhead for a local webhook receiver. Standard `http` is sufficient and keeps the bundle size at zero.
