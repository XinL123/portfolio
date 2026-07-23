import { defineConfig } from "vite";

/* /projects is a real route, served by the server — not a redirect.

   The Projects carousel lives inside the home document (it is the target of the
   hero -> Projects scroll handoff, so it cannot be lifted out without breaking
   that choreography), but it should still be addressable like About / Resume /
   Playground rather than as index.html#work.

   This rewrites the request INTERNALLY: the browser asks for /projects.html and
   gets the bytes of index.html back, with the address bar untouched. No stub
   page, no location.replace(), no #work ever appearing, no duplicated markup.
   Netlify does the same thing in production via the status=200 rules in
   netlify.toml — keep the two lists in sync.

   Registered inside configureServer (rather than returned from it) so it runs
   BEFORE Vite's own static/html middleware, which is what makes the rewrite
   land on the html transform pipeline as if index.html had been requested. */
const PROJECTS_ROUTES = new Set(["/projects", "/projects.html"]);

const projectsRoute = () => {
  const rewrite = (req, _res, next) => {
    const [pathname] = (req.url || "").split("?");
    if (PROJECTS_ROUTES.has(pathname)) req.url = "/index.html";
    next();
  };

  return {
    name: "projects-route",
    configureServer(server) {
      server.middlewares.use(rewrite);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite);
    },
  };
};

export default defineConfig({
  plugins: [projectsRoute()],
  server: {
    host: "0.0.0.0",
    port: 4173,
    strictPort: true,
    // dev only: never let the browser hold a stale styles.css/script.js --
    // the ?v= cache token only changes on release bumps
    headers: {
      "Cache-Control": "no-store",
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    strictPort: true,
  },
});
