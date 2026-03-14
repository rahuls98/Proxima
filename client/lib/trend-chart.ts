type LineAreaPaths = {
    linePath: string;
    areaPath: string;
};

type TrendDirection = "up" | "down" | "flat";

export type TrendVisual = {
    direction: TrendDirection;
    value: string;
    lineClass: string;
    fillClass: string;
};

type BuildLineAndAreaPathsOptions = {
    width?: number;
    height?: number;
};

type GetTrendVisualOptions = {
    flatLineClass?: string;
    flatFillClass?: string;
};

export function buildLineAndAreaPaths(
    values: Array<number | null>,
    minValue: number,
    maxValue: number,
    options: BuildLineAndAreaPathsOptions = {}
): LineAreaPaths {
    const width = options.width ?? 300;
    const height = options.height ?? 88;
    const stepX = width / Math.max(values.length - 1, 1);
    const denominator = Math.max(maxValue - minValue, 1);

    const points = values
        .map((value, index) => {
            if (value === null) {
                return null;
            }

            const x = index * stepX;
            const normalized = (value - minValue) / denominator;
            const y = height - normalized * height;
            return { x, y };
        })
        .filter((point): point is { x: number; y: number } => point !== null);

    if (points.length === 0) {
        return {
            linePath: "",
            areaPath: "",
        };
    }

    const linePath = points
        .map(
            (point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`
        )
        .join(" ");

    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const areaPath = `${linePath} L${lastPoint.x},${height} L${firstPoint.x},${height} Z`;

    return {
        linePath,
        areaPath,
    };
}

export function getTrendVisual(
    values: Array<number | null>,
    flatThreshold: number,
    options: GetTrendVisualOptions = {}
): TrendVisual {
    const flatLineClass = options.flatLineClass ?? "text-primary";
    const flatFillClass = options.flatFillClass ?? "fill-primary/10";

    const availableValues = values.filter(
        (value): value is number => value !== null
    );

    if (availableValues.length < 2) {
        return {
            direction: "flat",
            value: "0.0",
            lineClass: flatLineClass,
            fillClass: flatFillClass,
        };
    }

    const first = availableValues[0];
    const last = availableValues[availableValues.length - 1];
    const change = last - first;

    if (Math.abs(change) < flatThreshold) {
        return {
            direction: "flat",
            value: "0.0",
            lineClass: flatLineClass,
            fillClass: flatFillClass,
        };
    }

    const isUp = change > 0;

    return {
        direction: isUp ? "up" : "down",
        value: `${isUp ? "+" : ""}${change.toFixed(1)}`,
        lineClass: isUp ? "text-success" : "text-danger",
        fillClass: isUp ? "fill-success/10" : "fill-danger/10",
    };
}
