type Telemetry = {
    track: (...args: unknown[]) => void;
    emit: (event: Record<string, unknown>) => void;
};

declare const telemetry: Telemetry;
declare const otherTelemetry: Telemetry;
const buildPayload = (roll: string) => ({ roll });

export function recordCeremony(roll: string, payload: Record<string, unknown>) {
    telemetry.track('darkroom-opened');
    telemetry.track('film-priced', payload);
    telemetry.track(`roll-${roll}`, buildPayload(roll));

    telemetry.track('too-many', payload, { operator: 'Ada' });
    telemetry?.track('optional-chain');
    otherTelemetry.track('other-receiver', payload);
}
