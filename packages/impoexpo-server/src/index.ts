import express from "express";
import compression from "compression";
import dotenv from "dotenv";
import { logger } from "./logger";
import pino from "pino-http";
import cors from "cors";
import { registerGoogleEndpoints } from "./integrations/google/endpoints";
import { loadOrCreateKey } from "./helpers/crypto-utils";

dotenv.config();
if (!process.env.PORT) {
	logger.error("couldn't find PORT in .env, exiting");
	process.exit(1);
}
await loadOrCreateKey();

const app = express();
app.use(express.json());
app.use(compression());
app.use(pino({ logger: logger }));
app.use(cors());
app.disable("x-powered-by");

try {
	logger.info("registering integration endpoints");
	registerGoogleEndpoints(app);
} catch (err) {
	logger.error(`failed to register integration endpoints: ${err}`);
	process.exit(1);
}

app.listen(process.env.PORT, () => {
	logger.info(`server started listening on port ${process.env.PORT}`);
});
