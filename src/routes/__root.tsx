import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">404</p>
        <h1 className="mt-3 font-display text-5xl text-ink">Lost the loop.</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          That page isn't here. It might have moved, or never existed.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Loop — keep up with the friends that matter" },
      {
        name: "description",
        content:
          "Loop is a calm friend dashboard. See everyone you care about in one grid, plus a map of where they are. No feeds, no algorithm, no ads.",
      },
      { property: "og:title", content: "Loop — keep up with the friends that matter" },
      {
        property: "og:description",
        content: "One card per friend. One map of the world. No infinite scroll.",
      },
      { name: "twitter:title", content: "Loop — keep up with the friends that matter" },
      { name: "description", content: "Friend Grid is a social app that displays friends and their updates in a grid and map view." },
      { property: "og:description", content: "Friend Grid is a social app that displays friends and their updates in a grid and map view." },
      { name: "twitter:description", content: "Friend Grid is a social app that displays friends and their updates in a grid and map view." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f22ecb87-e0d0-44ad-9fa5-bc013c28e62d/id-preview-edcd92a0--04326ae7-d0ff-42e4-8702-c0dac0f70351.lovable.app-1778624498269.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f22ecb87-e0d0-44ad-9fa5-bc013c28e62d/id-preview-edcd92a0--04326ae7-d0ff-42e4-8702-c0dac0f70351.lovable.app-1778624498269.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
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

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
