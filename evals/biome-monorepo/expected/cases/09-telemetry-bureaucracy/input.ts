type Telemetry = {
    track: (...args: unknown[]) => void;
    emit: (event: Record<string, unknown>) => void;
};

declare const telemetry: Telemetry;
declare const otherTelemetry: Telemetry;
const buildPayload = (roll: string) => ({ roll });

export function recordCeremony(roll: string, payload: Record<string, unknown>) {
    telemetry.emit({ name: 'darkroom-opened' });
    telemetry.emit({ name: 'film-priced', payload: payload });
    telemetry.emit({ name: `roll-${roll}`, payload: buildPayload(roll) });

    telemetry.track('too-many', payload, { operator: 'Ada' });
    telemetry?.track('optional-chain');
    otherTelemetry.track('other-receiver', payload);
}
