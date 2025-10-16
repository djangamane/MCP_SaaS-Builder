import { registerClient } from '@/lib/realtime';
import { OrchestrationEvent } from '@/types';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let cleanup: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: string) => {
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      };

      cleanup = registerClient(send, () => controller.close());

      const ack: OrchestrationEvent = {
        type: 'connection:ack',
        message: 'Connected to orchestration event stream.',
        timestamp: Date.now(),
      };
      send(JSON.stringify(ack));

      request.signal.addEventListener('abort', () => {
        cleanup?.();
        cleanup = undefined;
      });
    },
    cancel() {
      cleanup?.();
      cleanup = undefined;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
