import { boot, ColyseusTestServer } from "@colyseus/testing";
import appConfig from "../../src/app.config";

let sharedServer: ColyseusTestServer | null = null;

export async function getSharedColyseusServer(): Promise<ColyseusTestServer> {
  if (!sharedServer) {
    sharedServer = await boot(appConfig);
  }
  return sharedServer;
}

// Root Mocha hook ensures the shared test server shuts down cleanly once after all suites finish
after(async () => {
  if (sharedServer) {
    const s = sharedServer;
    sharedServer = null;
    await s.shutdown();
  }
});

