---
name: behavioral-governance
description: Awareness of the AI Behavioral Runtime governance system. Use when the runtime is actively governing Claude Code to understand current step contracts, constraints, validation requirements, and workflow state.
---

# AI Behavioral Runtime Governance

This Claude Code session is governed by the AI Behavioral Runtime plugin. The runtime standardizes how interactions are categorized, reasoned through, constrained, validated, and transitioned.

## How It Works

The runtime operates through Claude Code hooks:

1. **SessionStart**: The runtime initializes a run and compiles the first step contract. Instructions are injected as a system message.
2. **PreToolUse**: Each tool call is evaluated against active constraints and the permission policy.
3. **PostToolUse**: Tool results are recorded in the execution trace.
4. **Stop**: When Claude attempts to stop, the runtime validates whether the current step's completion criteria are met. If not, the stop is blocked and Claude continues.
5. **SessionEnd**: The run is finalized and traces are persisted.

## Core Rules

- The model reasons. The runtime governs.
- Validation decides whether execution may continue.
- The runtime owns transitions, constraints, permissions, and completion criteria.
- The model must not independently decide that it is finished, that validation passed, or that a constraint may be ignored.

## Compliance

When governed:
- Follow the step contract injected at session start
- Respect constraint requirements (must/must_not/should/should_not)
- Provide evidence for completion claims
- Do not claim success without meeting completion criteria
