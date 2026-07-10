export type ExecutionPermission =
  | "none"
  | "simulate"
  | "read_only"
  | "propose_changes"
  | "execute";

export interface CapabilityPermissionPolicy {
  readonly filesystemRead?: boolean;
  readonly filesystemWrite?: boolean;
  readonly shell?: boolean;
  readonly network?: boolean;
}

export interface PermissionPolicy {
  readonly execution: ExecutionPermission;
  readonly capabilities?: CapabilityPermissionPolicy;
}
