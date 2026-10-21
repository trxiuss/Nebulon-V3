import { requireAuth } from "@/lib/auth";
import { getPermissionEpoch } from "@/lib/db";
import { permissionStamp } from "@/lib/permissions";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const TICK_MS = 1500;
const MAX_TICKS = 40;

async function readState() {
  const { user } = await requireAuth({ method: "GET", headers: new Headers() });
  if (!user) return { authed: false, stamp: "anon", epoch: 0 };
  const epoch = await getPermissionEpoch();
  return { authed: true, stamp: permissionStamp(user), epoch };
}

export async function GET() {
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    cancel() {
      closed = true;
    },
    async start(controller) {
      const send = (event, payload) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
        } catch (err) {
          closed = true;
        }
      };

      let state = await readState();
      send("state", state);

      for (let i = 0; i < MAX_TICKS && !closed; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, TICK_MS));
        let next;
        try {
          next = await readState();
        } catch (err) {
          break;
        }
        if (next.stamp !== state.stamp || next.epoch !== state.epoch || next.authed !== state.authed) {
          state = next;
          send("state", state);
        } else {
          send("ping", { t: Date.now() });
        }
      }

      if (!closed) {
        try {
          controller.close();
        } catch (err) {}
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
