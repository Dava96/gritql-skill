const logger = { log: (...messages: unknown[]) => messages };

export function narrateDevelopment(roll: string) {
    console.log();
    console.log('Loading roll');
    console.log('Developing', roll, { vigorously: true });
    console.warn('The fixer smells unusual');
    logger.log('Keep the laboratory logger');
    const method = 'console.log';
    const consoleLogLevel = 3;

    return { method, consoleLogLevel };
}
