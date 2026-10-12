import { createDb } from "./db";
import { buildServer } from "./server";

const db = createDb(process.env.DB_PATH ?? "./data/staff.sqlite");
const app = buildServer(db);

app
  .listen({ port: Number(process.env.PORT ?? 3002) })
  .then((address) => {
    console.log(`fm-suite backend listening on ${address}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
