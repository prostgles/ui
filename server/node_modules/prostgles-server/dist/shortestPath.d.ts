export declare type Graph = {
    [key: string]: {
        [key: string]: number;
    };
};
export declare const findShortestPath: (graph: Graph, startNode: string, endNode: string) => {
    distance: number;
    path: string[];
};
//# sourceMappingURL=shortestPath.d.ts.map