import { Datastore } from "./deps.js";
import adapter from "./adapter.js";
import PORT_NAME from "./port_name.js";

export default (dbFile) => ({
  id: "queue",
  port: PORT_NAME,
  load: () => {
    if (!dbFile) {
      throw new Error("DB FILE: required for queue adapter");
    }
    const db = new Datastore({ filename: dbFile, autoload: true });
    return { db };
  }, // load env
  link: (env) => (_) => adapter(env), // link adapter
});
