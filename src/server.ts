import "reflect-metadata";

import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
// eslint-disable-next-line import/no-extraneous-dependencies
import session from "cookie-session";
import { log, logSuccess } from "diginext-utils/dist/console/log";
import type { Express } from "express";
import express from "express";
import { queryParser } from "express-query-parser";
import type { Server } from "http";
import { createServer } from "http";
import passport from "passport";
import path from "path";
import { Server as SocketServer } from "socket.io";

import { googleStrategy } from "@/modules/passports/googleStrategy";
import { jwtStrategy } from "@/modules/passports/jwtStrategy";

import { Config, IsProd } from "./app.config";
import AppDatabase from "./AppDatabase";
import { failSafeHandler } from "./middlewares/failSafeHandler";
import routes from "./routes/routes";
import { startupScripts } from "./startup-scripts";

// const logger = new LogStream();

/**
 * ENVIRONMENT CONFIG
 */
const { BASE_PATH, PORT, CLI_MODE } = Config;

/**
 * EXPRESS JS INITIALIZING
 */
let app: Express;
let server: Server;
let socketIO: SocketServer;
export let isServerReady = false;

export function setServerStatus(status: boolean) {
	isServerReady = status;
}

function initialize() {
	// log(`Server is initializing...`);

	app = express();
	server = createServer(app);

	/**
	 * Websocket / SOCKET.IO
	 */
	socketIO = new SocketServer(server, { transports: ["websocket"] });
	socketIO.on("connection", (socket) => {
		console.log("a user connected");

		socket.on("join", (data) => {
			console.log("join room:", data);
			socket.join(data.room);
		});
	});

	/**
	 * CORS MIDDLEWARE
	 * Access-Control-Allow-Headers
	 */
	app.use((req, res, next) => {
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Methods", "GET, PATCH, POST, DELETE");
		res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control");
		res.header("X-Powered-By", "TOP GROUP");
		next();
	});

	/**
	 * SERVING STATIC FILES
	 */
	app.use(express.static(path.resolve(process.cwd(), "public")));

	/**
	 * PASSPORT STRATEGY
	 */
	passport.use(googleStrategy);
	passport.use(jwtStrategy);
	passport.serializeUser((user, done) => done(null, user));
	passport.deserializeUser((obj, done) => done(null, obj));

	/**
	 * BODY PARSER
	 */
	app.use(bodyParser.urlencoded({ limit: "200mb", extended: true }));
	app.use(bodyParser.json({ limit: "200mb" }));

	/**
	 * QUERY PARSER
	 */
	app.use(
		queryParser({
			parseNull: true,
			parseUndefined: true,
			parseBoolean: true,
			parseNumber: true,
		})
	);

	/**
	 * COOKIES & SESSION PARSER
	 */
	app.use(cookieParser());
	app.use(
		session({
			name: Config.grab(`SESSION_NAME`, `my-express-app`),
			secret: Config.grab(`JWT_SECRET`),
			maxAge: 1000 * 60 * 100,
		})
	);

	/**
	 * AUTHENTICATION MIDDLEWARE
	 */
	app.use(passport.initialize());
	app.use(passport.session());

	/**
	 * LOGGING SYSTEM MIDDLEWARE - ENABLED
	 * Enable when running on server
	 */
	// morgan.token("user", (req: AppRequest) => (req.user ? `[${req.user.slug}]` : "[unauthenticated]"));
	// const morganMessage = IsDev()
	// 	? "[REQUEST :date[clf]] :method - :user - :url :status :response-time ms - :res[content-length]"
	// 	: `[REQUEST :date[clf]] :method - :user - ":url HTTP/:http-version" :status :response-time ms :res[content-length] ":referrer" ":user-agent"`;
	// const morganOptions = {
	// 	skip: (req) => req.method.toUpperCase() === "OPTIONS",
	// 	// stream: logger,
	// } as unknown as morgan.Options<AppRequest, Response>;
	// app.use(morgan(morganMessage, morganOptions));

	// Mở lộ ra path cho HEALTHCHECK & APIs (nếu có)
	app.use(`/${BASE_PATH}`, routes);

	/**
	 * ROUTE 404 & FAIL SAFE HANDLING MIDDLEWARE
	 */
	// app.use("*", route404_handler);

	// make sure the Express app won't be crashed if there are any errors
	if (IsProd()) app.use(failSafeHandler);

	/**
	 * SERVER HANDLING
	 */
	function onConnect() {
		logSuccess(`Server is UP & listening at port ${PORT}...`);
	}

	server.on("error", (e: any) => log(`ERROR:`, e));
	server.listen(PORT, onConnect);

	/**
	 * BUILD SERVER INITIAL START-UP SCRIPTS:
	 * - Connect GIT providers (if any)
	 * - Connect container registries (if any)
	 * - Connect K8S clusters (if any)
	 */
	startupScripts();
}

log(`Connecting to database. Please wait...`);
AppDatabase.connect(initialize);

/**
 * Close the database connection when the application is terminated
 */
process.on("SIGINT", async () => {
	await AppDatabase.disconnect();
	process.exit(0);
});

export const getIO = () => socketIO;

export { app, server, socketIO };
