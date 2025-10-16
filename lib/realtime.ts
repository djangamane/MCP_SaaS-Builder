import { OrchestrationEvent, OrchestrationLogEntry } from '@/types';

type BroadcastClient = {
  id: number;
  send: (payload: string) => void;
  close?: () => void;
};

const clients = new Map<number, BroadcastClient>();
let clientId = 0;

export function registerClient(send: (payload: string) => void, close?: () => void) {
  const id = ++clientId;
  clients.set(id, { id, send, close });

  return () => {
    const client = clients.get(id);
    if (!client) {
      return;
    }

    clients.delete(id);
    try {
      client.close?.();
    } catch {
      // Ignore close failures
    }
  };
}

type BroadcastPayload = OrchestrationEvent | OrchestrationLogEntry | string;

export function broadcast(message: BroadcastPayload) {
  const payload = typeof message === 'string' ? message : JSON.stringify(message);
  clients.forEach((client) => {
    try {
      client.send(payload);
    } catch {
      clients.delete(client.id);
      try {
        client.close?.();
      } catch {
        // Ignore cleanup failures
      }
    }
  });
}
