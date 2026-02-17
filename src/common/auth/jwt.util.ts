import ms, { type StringValue } from 'ms';

export function durationToSeconds(value: string, name: string): number {
  // `ms()` expects `StringValue` but env config is a plain string.
  // We validate the format at runtime and then convert to seconds.
  const parsedMs = ms(value as StringValue);
  if (
    typeof parsedMs !== 'number' ||
    !Number.isFinite(parsedMs) ||
    parsedMs <= 0
  ) {
    throw new Error(`Invalid ${name}`);
  }
  return Math.floor(parsedMs / 1000);
}
