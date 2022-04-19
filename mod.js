import { Datastore, join } from "./deps.js";
import adapter from "./adapter.js";
import PORT_NAME from "./port_name.js";

export default (args = { dir: ".", name: "hyper-queue.db" }) => ({
  id: "queue",
  port: PORT_NAME,
  load: () => {
    // allow passing a string or object with { dir } field
    let file;
    if (typeof args === "string") {
      file = args;
    } else if (typeof args === "object") {
      const dir = args.dir || ".";
      const name = args.name || "hyper-queue.db";
      file = join(dir, name);
    }

    if (!file || typeof file !== "string") {
      throw new Error("{ dir, name } or path to file required");
    }

    const db = new Datastore({ filename: file, autoload: true });
    return { db };
  }, // load env
  link: (env) => (_) => adapter(env), // link adapter
});
