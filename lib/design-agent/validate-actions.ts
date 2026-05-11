import type { DesignAction } from "@/lib/design-agent/schema"

/** Drops invalid ops (unknown node ids, dangling edges) while preserving order so partial updates stay safe. */
export function validateActionsAgainstSnapshot(actions: DesignAction[], existingNodeIds: Set<string>): DesignAction[] {
  const knownIds = new Set(existingNodeIds)
  const next: DesignAction[] = []

  for (const action of actions) {
    switch (action.op) {
      case "add_node":
        next.push(action)
        knownIds.add(action.id)
        break
      case "move_node":
      case "resize_node":
      case "update_node_data":
        if (!knownIds.has(action.id)) break
        next.push(action)
        break
      case "delete_node":
        if (!knownIds.has(action.id)) break
        next.push(action)
        knownIds.delete(action.id)
        break
      case "add_edge":
        if (!knownIds.has(action.source) || !knownIds.has(action.target)) break
        next.push(action)
        break
      case "delete_edge":
        next.push(action)
        break
    }
  }

  return next
}
