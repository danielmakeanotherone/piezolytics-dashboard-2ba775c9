import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-display text-acc">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-text">Page not found</h2>
        <p className="mt-2 text-sm text-text3">This zone isn't on the floor plan.</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-acc px-4 py-2 text-sm font-medium text-bg hover:opacity-90"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Piezolytics — Floor Traffic Dashboard" },
      { name: "description", content: "Real-time piezo floor sensor analytics with isometric heatmap." },
      { property: "og:title", content: "Piezolytics — Floor Traffic Dashboard" },
      { name: "twitter:title", content: "Piezolytics — Floor Traffic Dashboard" },
      { property: "og:description", content: "Real-time piezo floor sensor analytics with isometric heatmap." },
      { name: "twitter:description", content: "Real-time piezo floor sensor analytics with isometric heatmap." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/95426890-7a41-401b-a255-9985962cb03d/id-preview-8a51ca14--c91b22d6-ce7d-401c-89a7-1288a7b992b8.lovable.app-1778392077758.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/95426890-7a41-401b-a255-9985962cb03d/id-preview-8a51ca14--c91b22d6-ce7d-401c-89a7-1288a7b992b8.lovable.app-1778392077758.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: () => <Outlet />,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
