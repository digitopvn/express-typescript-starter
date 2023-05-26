import { log } from "diginext-utils/dist/console/log";

import { setServerStatus } from "@/server";

/**
 * BUILD SERVER INITIAL START-UP SCRIPTS:
 * - Create config directory in {HOME_DIR}
 * - Connect GIT providers (if any)
 * - Connect Container Registries (if any)
 * - Connect K8S clusters (if any)
 * - Start system cronjobs
 * - Seed some initial data
 */
export async function startupScripts() {
	log(`-------------- Server is initializing -----------------`);

	/**
	 * Mark "healthz" return true & server is ready to receive connections:
	 */
	setServerStatus(true);
}
