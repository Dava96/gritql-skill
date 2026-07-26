declare const telemetry: { track(...args: unknown[]): void };
declare const otherTelemetry: { track(...args: unknown[]): void };
declare const makePayload: () => unknown;
declare const eventName: string;

telemetry.emit({ name: eventName });
telemetry.emit({ name: `hidden-${eventName}`, payload: makePayload() });
telemetry?.track('optional');
telemetry.track('crowded', makePayload(), 3);
otherTelemetry.track('other');
