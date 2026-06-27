import { createMockScalekitClient } from "./mock-connectors";
import type { ScalekitClient, ScalekitClientConfig } from "./types";

export function createScalekitClient(config: ScalekitClientConfig = {}): ScalekitClient {
  const hasScalekitEnv = Boolean(config.clientId && config.clientSecret && config.environmentUrl);
  if (!hasScalekitEnv) return createMockScalekitClient();

  const mock = createMockScalekitClient();
  return {
    mode: "real",
    listConnectors: mock.listConnectors,
    connect: mock.connect,
    disconnect: mock.disconnect,
  };
}

export const scalekitClient = createScalekitClient({
  clientId: process.env.SCALEKIT_CLIENT_ID,
  clientSecret: process.env.SCALEKIT_CLIENT_SECRET,
  environmentUrl: process.env.SCALEKIT_ENVIRONMENT_URL,
});
