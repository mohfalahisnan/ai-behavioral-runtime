# First Host Target: Claude Code

**Decision:** Build Claude Code first. Use Codex as the second compatibility target.

Claude Code currently gives the strongest practical local-plugin lifecycle for the MVP:

| Need | Claude Code hook/storage | Runtime capability |
|---|---|---|
| Inject instructions | `SessionStart`, `UserPromptSubmit` | `canInjectInstructions: true` |
| Observe final model output | `Stop.last_assistant_message` | `canObserveModelOutput: true` |
| Observe and block tools | `PreToolUse` decisions | `canObserveToolCalls: true`, `canBlockToolCalls: true` |
| Continue the workflow | blocking `Stop` response | `canTriggerAdditionalTurns: true` |
| Persist local state | `${CLAUDE_PLUGIN_DATA}` | `canPersistLocalState: true` |

## Enforcement classification

Claude Code is `interceptable`, not automatically `fully_governed`.

- `@file` references bypass `PreToolUse(Read)` and require Read deny rules.
- Stop continuation is capped after eight consecutive blocks.
- Users or administrators may disable or restrict hooks.
- Final text observation does not imply the plugin can always suppress already-visible text.
- Tool-family coverage must remain visible instead of being collapsed into an unconditional hard-governance claim.

## Why Codex is second

Codex has instruction injection, final-output observation, stop continuation, plugin data storage, and local plugin packaging. Current official documentation describes partial interception for simple Bash, `apply_patch`, and MCP calls, while newer `unified_exec`, WebSearch, and other tool families are not completely covered. That makes Codex valuable for the second adapter compatibility check after the Claude Code contract is measured.

## Sources

- [Claude Code hooks](https://code.claude.com/docs/en/hooks)
- [Claude Code plugins](https://code.claude.com/docs/en/plugins)
- [Claude Code plugin discovery and installation](https://code.claude.com/docs/en/discover-plugins)
- [Codex hooks](https://learn.chatgpt.com/docs/hooks)
- [Codex plugin packaging](https://learn.chatgpt.com/docs/build-plugins)
- [Codex advanced hook configuration](https://learn.chatgpt.com/docs/config-file/config-advanced)
