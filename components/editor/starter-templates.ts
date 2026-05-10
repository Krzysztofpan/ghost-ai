import {
  DEFAULT_SHAPE_DIMENSIONS,
  NODE_COLORS,
  type CanvasEdge,
  type CanvasNode,
  type NodeShape,
} from "@/types/canvas"

export type CanvasTemplate = {
  id: string
  name: string
  description: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

function canvasEdge(id: string, source: string, target: string): CanvasEdge {
  return {
    id,
    type: "canvasEdge",
    source,
    target,
    data: {},
  }
}

type TemplateNodeOpts = {
  shape?: NodeShape
  colorFill?: string
  width?: number
  height?: number
}

/** Builds a `canvasNode` with palette-aligned defaults for readable template definitions. */
function templateNode(
  id: string,
  label: string,
  x: number,
  y: number,
  opts: TemplateNodeOpts = {},
): CanvasNode {
  const shape = opts.shape ?? "rectangle"
  const dims = DEFAULT_SHAPE_DIMENSIONS[shape]
  const width = opts.width ?? dims.width
  const height = opts.height ?? dims.height
  return {
    id,
    type: "canvasNode",
    position: { x, y },
    width,
    height,
    data: {
      label,
      color: opts.colorFill ?? NODE_COLORS[0].fill,
      shape,
    },
  }
}

const microservicesTemplate = ((): CanvasTemplate => {
  const nodes: CanvasNode[] = [
    templateNode("gw", "API Gateway", 336, 28, {
      shape: "rectangle",
      colorFill: NODE_COLORS[1].fill,
      width: 192,
      height: 96,
    }),
    templateNode("auth", "Auth Service", 72, 196, {
      shape: "pill",
      colorFill: NODE_COLORS[2].fill,
    }),
    templateNode("users", "User Service", 352, 196, {
      shape: "rectangle",
      colorFill: NODE_COLORS[7].fill,
    }),
    templateNode("orders", "Order Service", 616, 196, {
      shape: "rectangle",
      colorFill: NODE_COLORS[3].fill,
    }),
    templateNode("pay", "Payments", 352, 356, {
      shape: "rectangle",
      colorFill: NODE_COLORS[5].fill,
    }),
    templateNode("bus", "Message Bus", 352, 492, {
      shape: "hexagon",
      colorFill: NODE_COLORS[4].fill,
    }),
    templateNode("notify", "Notifications", 112, 628, {
      shape: "cylinder",
      colorFill: NODE_COLORS[6].fill,
    }),
    templateNode("analytics", "Analytics Worker", 584, 628, {
      shape: "rectangle",
      colorFill: NODE_COLORS[1].fill,
      width: 176,
      height: 96,
    }),
    templateNode("cache", "Redis Cache", 656, 356, {
      shape: "diamond",
      colorFill: NODE_COLORS[0].fill,
    }),
    templateNode("db-users", "Users DB", 72, 492, {
      shape: "cylinder",
      colorFill: NODE_COLORS[2].fill,
    }),
    templateNode("db-orders", "Orders DB", 632, 492, {
      shape: "cylinder",
      colorFill: NODE_COLORS[3].fill,
    }),
  ]

  const edges: CanvasEdge[] = [
    canvasEdge("e-gw-auth", "gw", "auth"),
    canvasEdge("e-gw-users", "gw", "users"),
    canvasEdge("e-gw-orders", "gw", "orders"),
    canvasEdge("e-orders-pay", "orders", "pay"),
    canvasEdge("e-users-db", "users", "db-users"),
    canvasEdge("e-orders-db", "orders", "db-orders"),
    canvasEdge("e-gw-cache", "gw", "cache"),
    canvasEdge("e-pay-bus", "pay", "bus"),
    canvasEdge("e-bus-notify", "bus", "notify"),
    canvasEdge("e-bus-analytics", "bus", "analytics"),
    canvasEdge("e-auth-bus", "auth", "bus"),
  ]

  return {
    id: "microservices",
    name: "Microservices",
    description:
      "Gateway-backed services with payments, async messaging, dedicated data stores, and a shared cache.",
    nodes,
    edges,
  }
})()

const cicdTemplate = ((): CanvasTemplate => {
  const nodes: CanvasNode[] = [
    templateNode("repo", "Source Repo", 48, 248, {
      shape: "pill",
      colorFill: NODE_COLORS[1].fill,
      width: 200,
      height: 72,
    }),
    templateNode("ci", "CI Runner", 296, 248, {
      shape: "rectangle",
      colorFill: NODE_COLORS[2].fill,
    }),
    templateNode("test", "Tests", 528, 248, {
      shape: "circle",
      colorFill: NODE_COLORS[6].fill,
    }),
    templateNode("build", "Build Image", 728, 248, {
      shape: "hexagon",
      colorFill: NODE_COLORS[3].fill,
    }),
    templateNode("staging", "Deploy → Staging", 288, 428, {
      shape: "rectangle",
      colorFill: NODE_COLORS[7].fill,
      width: 200,
      height: 96,
    }),
    templateNode("prod", "Deploy → Production", 552, 428, {
      shape: "rectangle",
      colorFill: NODE_COLORS[4].fill,
      width: 216,
      height: 96,
    }),
    templateNode("observe", "Monitoring & Alerts", 424, 72, {
      shape: "diamond",
      colorFill: NODE_COLORS[5].fill,
    }),
    templateNode("rollback", "Rollback Policy", 792, 428, {
      shape: "rectangle",
      colorFill: NODE_COLORS[0].fill,
      width: 168,
      height: 88,
    }),
  ]

  const edges: CanvasEdge[] = [
    canvasEdge("e-repo-ci", "repo", "ci"),
    canvasEdge("e-ci-test", "ci", "test"),
    canvasEdge("e-test-build", "test", "build"),
    canvasEdge("e-build-staging", "build", "staging"),
    canvasEdge("e-staging-prod", "staging", "prod"),
    canvasEdge("e-build-observe", "build", "observe"),
    canvasEdge("e-prod-observe", "prod", "observe"),
    canvasEdge("e-prod-rollback", "prod", "rollback"),
  ]

  return {
    id: "cicd-pipeline",
    name: "CI/CD pipeline",
    description:
      "Source control through automated tests, artifact build, staged rollout, observability, and rollback hooks.",
    nodes,
    edges,
  }
})()

const eventDrivenTemplate = ((): CanvasTemplate => {
  const nodes: CanvasNode[] = [
    templateNode("web", "Web App", 376, 56, {
      shape: "rectangle",
      colorFill: NODE_COLORS[1].fill,
      width: 184,
      height: 96,
    }),
    templateNode("orders-api", "Orders API", 376, 216, {
      shape: "pill",
      colorFill: NODE_COLORS[7].fill,
      width: 200,
      height: 72,
    }),
    templateNode("broker", "Event Broker", 376, 372, {
      shape: "hexagon",
      colorFill: NODE_COLORS[3].fill,
    }),
    templateNode("inv", "Inventory Handler", 96, 548, {
      shape: "rectangle",
      colorFill: NODE_COLORS[6].fill,
    }),
    templateNode("ship", "Shipping Handler", 376, 548, {
      shape: "rectangle",
      colorFill: NODE_COLORS[2].fill,
    }),
    templateNode("analytics", "Analytics Projector", 656, 548, {
      shape: "rectangle",
      colorFill: NODE_COLORS[5].fill,
    }),
    templateNode("dlq", "Dead-letter Queue", 376, 696, {
      shape: "diamond",
      colorFill: NODE_COLORS[4].fill,
    }),
    templateNode("ops-db", "Operational Store", 728, 372, {
      shape: "cylinder",
      colorFill: NODE_COLORS[0].fill,
    }),
    templateNode("read-model", "Read Models", 728, 216, {
      shape: "cylinder",
      colorFill: NODE_COLORS[1].fill,
    }),
  ]

  const edges: CanvasEdge[] = [
    canvasEdge("e-web-orders", "web", "orders-api"),
    canvasEdge("e-orders-broker", "orders-api", "broker"),
    canvasEdge("e-broker-inv", "broker", "inv"),
    canvasEdge("e-broker-ship", "broker", "ship"),
    canvasEdge("e-broker-analytics", "broker", "analytics"),
    canvasEdge("e-broker-dlq", "broker", "dlq"),
    canvasEdge("e-inv-ops", "inv", "ops-db"),
    canvasEdge("e-analytics-read", "analytics", "read-model"),
  ]

  return {
    id: "event-driven",
    name: "Event-driven system",
    description:
      "Commands hit an API, domain events flow through a broker to handlers, projections, failure queues, and stores.",
    nodes,
    edges,
  }
})()

export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  microservicesTemplate,
  cicdTemplate,
  eventDrivenTemplate,
]
