const chokidar = require("chokidar");
const esbuild = require("esbuild");
const http = require("http");
const path = require("path");

const clients = [];
const watch = process.argv.includes("--watch");
const watchedDirectories = [
  "./app/javascript/**/*.js",
  "./app/views/**/*.html.erb",
  "./app/assets/stylesheets/*.css",
];
const bannerJs = watch
  ? ' (() => new EventSource("http://localhost:8082").onmessage = () => location.reload())();'
  : "";

const config = {
  entryPoints: ["application.ts"],
  bundle: true,
  sourcemap: true,
  incremental: watch,
  outdir: path.join(process.cwd(), "app/assets/builds"),
  absWorkingDir: path.join(process.cwd(), "app/javascript"),
  banner: { js: bannerJs },
};

if (watch) {
  http
    .createServer((req, res) => {
      return clients.push(
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Access-Control-Allow-Origin": "*",
          Connection: "keep-alive",
        })
      );
    })
    .listen(8082);

  (async () => {
    const result = await esbuild.build(config);
    chokidar.watch(watchedDirectories).on("all", (event, path) => {
      if (path.includes("javascript")) {
        console.log(`rebuilding ${path}`);
        result.rebuild();
      }
      clients.forEach((res) => res.write("data: update\n\n"));
      clients.length = 0;
    });
  })();
} else {
  esbuild.build(config).catch(() => process.exit(1));
}