type Graph<T extends {}> = Map<T, T[]>;

function range(start: number, end: number): number[] {
    if (start > end) return [];
    return [start, ...range(start + 1, end)];
}

export default function detectCyleBenchmark(): boolean {
    const n = 500;
    const benchmarkGraph = new Map<number, number[]>();
    // build a graph with n nodes and no cycle
    for (let i = 0; i < n; i++) {
        benchmarkGraph.set(i, range(i, n - 1));
    }
    return detectCycle(benchmarkGraph);
}

/**
 * Detects cycles in an undirected graph
 */
function detectCycle<T>(graph: Graph<T>): boolean {
    const visited: Map<T, boolean> = new Map();

    return [...graph.keys()].some(current => {
        if (!visited.get(current)) {
            return _detectCycle(graph, current, visited, undefined);
        }
    });
}

function _detectCycle<T>(graph: Graph<T>, current: T, visited: Map<T, boolean>, parent: T | undefined): boolean {
    visited.set(current, true);

    const neighbours = graph.get(current);

    if (!neighbours) {
        throw Error("Err invalid graph format");
    }

    return neighbours.some(neighbour => {
        if (!visited.get(neighbour)) {
            // If an adjacent is not visited, then recur for that adjacent
            return _detectCycle(graph, neighbour, visited, current);
        } else if (neighbour !== parent) {
            /*
             * If an adjacent node is visited and not a parent of current vertex,
             * then there is a cycle.
             */
            return true;
        }
    });
}
