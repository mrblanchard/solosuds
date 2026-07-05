export function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    return require("./instrumentation.edge");
  } else {
    return require("./instrumentation.node");
  }
}
