type MiniTrendChartProps = {
    yAxisLabels: string[];
    linePath: string;
    areaPath?: string;
    lineColorClass: string;
    areaColorClass?: string;
    xAxisLabels: string[];
    valueLabels?: string[];
};

export function MiniTrendChart({
    yAxisLabels,
    linePath,
    areaPath,
    lineColorClass,
    areaColorClass,
    xAxisLabels,
    valueLabels,
}: MiniTrendChartProps) {
    const yAxisCount = yAxisLabels.length;
    const chartHeight = 88;

    return (
        <div className="w-full flex gap-2">
            <div
                className="flex flex-col justify-between text-[9px] text-text-muted font-medium leading-none"
                style={{ height: `${chartHeight}px` }}
            >
                {yAxisLabels.map((label) => (
                    <span key={label}>{label}</span>
                ))}
            </div>
            <div className="flex-1">
                <div
                    className="w-full rounded-lg bg-surface-hover/40 border border-border-subtle px-2 py-1"
                    style={{ height: `${chartHeight}px` }}
                >
                    <svg
                        viewBox={`0 0 300 ${chartHeight}`}
                        className="w-full h-full"
                        preserveAspectRatio="none"
                    >
                        {yAxisLabels.map((label, index) => {
                            const y =
                                yAxisCount > 1
                                    ? (index / (yAxisCount - 1)) * chartHeight
                                    : chartHeight / 2;

                            return (
                                <line
                                    key={`${label}-${index}`}
                                    x1="0"
                                    y1={y}
                                    x2="300"
                                    y2={y}
                                    stroke="currentColor"
                                    className="text-border-subtle"
                                    strokeWidth="1"
                                />
                            );
                        })}

                        {areaPath ? (
                            <path d={areaPath} className={areaColorClass} />
                        ) : null}

                        <path
                            d={linePath}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            className={lineColorClass}
                        />
                    </svg>
                </div>
                <div className="mt-2 grid grid-cols-7 gap-1 text-[10px] text-text-muted font-semibold uppercase tracking-wide">
                    {xAxisLabels.map((label, index) => (
                        <span key={`${label}-${index}`} className="text-center">
                            {label}
                        </span>
                    ))}
                </div>
                {valueLabels ? (
                    <div className="mt-0.5 grid grid-cols-7 gap-1 text-[9px] text-text-main font-medium">
                        {valueLabels.map((value, index) => (
                            <span
                                key={`${value}-${index}`}
                                className="text-center"
                            >
                                {value}
                            </span>
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
