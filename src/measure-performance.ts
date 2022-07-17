import { performance } from "perf_hooks";

// We use our own performance hooks implementation for easier use, but also call node's performance hooks, so it shows up in the profiler.

let enabled = false;
const marks = new Map<string, number>();
const durations = new Map<string, number>();

function timestamp() {
    return performance.now();
}

/**
 * Marks a performance event, with the given markName.
 */
function mark(markName: string) {
    if (enabled) {
        marks.set(markName, timestamp());
        performance.mark(markName);
    }
}

/**
 * Adds a performance measurement with the specified name.
 *
 * @param measureName The name of the performance measurement.
 * @param startMarkName The name of the starting mark
 * @param endMarkName The name of the ending mark
 */
function measure(measureName: string, startMarkName: string, endMarkName: string) {
    if (enabled) {
        const end = marks.get(endMarkName) ?? timestamp();
        const start = marks.get(startMarkName) ?? performance.timeOrigin;
        const previousDuration = durations.get(measureName) ?? 0;
        durations.set(measureName, previousDuration + (end - start));
        performance.measure(measureName, startMarkName, endMarkName);
    }
}

/**
 * Starts a performance measurement section.
 * @param name name of the measurement
 */
export function startSection(name: string) {
    mark("start " + name);
}

/**
 * Ends a performance measurement section.
 * @param name name of the measurement
 */
export function endSection(name: string) {
    mark("end " + name);
    measure(name, "start " + name, "end " + name);
}

export function isMeasurementEnabled() {
    return enabled;
}

export function enableMeasurement() {
    if (!enabled) {
        enabled = true;
    }
}

export function disableMeasurement() {
    if (enabled) {
        enabled = false;
        marks.clear();
        durations.clear();
    }
}

export function forEachMeasure(callback: (measureName: string, duration: number) => void) {
    durations.forEach((duration, measureName) => callback(measureName, duration));
}

export function getTotalDuration() {
    let total = 0;
    forEachMeasure((_, duration) => (total += duration));
    return total;
}
