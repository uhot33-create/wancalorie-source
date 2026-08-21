import { createMiddleware } from "@tanstack/react-start";

export const authMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getBearerToken } = await import("./client");
    const token = await getBearerToken();
    return next({ sendContext: { bearerToken: token ?? undefined } });
  })
  .server(async ({ next, context }) => {
    const { assertSameSiteRequest } = await import("./isolation.server");
    const { requireUserId } = await import("./verify.server");
    assertSameSiteRequest();
    const userId = await requireUserId(context.bearerToken);
    return next({ context: { userId } });
  });
