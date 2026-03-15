import { useMemo, useState } from "react";

type SessionsTableRow = {
    id: string;
    name: string;
    persona: string;
    personaId?: string;
    timestamp: string;
    duration: string;
    confidence: number;
    sentiment: number;
};

type SessionsTableProps = {
    rows: SessionsTableRow[];
    isLoading?: boolean;
    onViewReport?: (sessionId: string) => void;
    onViewPersona?: (personaId: string) => void;
    onDelete?: (sessionId: string) => void;
    showDelete?: boolean;
    showFooter?: boolean;
    totalCount?: number;
};

export function SessionsTable({
    rows,
    isLoading = false,
    onViewReport,
    onViewPersona,
    onDelete,
    showDelete = false,
    showFooter = false,
    totalCount,
}: SessionsTableProps) {
    const formatDate = (value: string) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "--";
        }
        return date.toISOString().slice(0, 10);
    };
    const PAGE_SIZE = 10;
    const [currentPage, setCurrentPage] = useState(1);
    const resolvedTotalCount = totalCount ?? rows.length;

    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

    const safeCurrentPage = Math.min(currentPage, totalPages);

    const paginationRange = useMemo(() => {
        if (!showFooter) {
            return {
                start: 1,
                end: rows.length,
            };
        }

        if (rows.length === 0) {
            return {
                start: 0,
                end: 0,
            };
        }

        const start = (safeCurrentPage - 1) * PAGE_SIZE + 1;
        const end = Math.min(safeCurrentPage * PAGE_SIZE, rows.length);

        return { start, end };
    }, [showFooter, rows.length, safeCurrentPage]);

    const visibleRows = useMemo(() => {
        if (!showFooter) {
            return rows;
        }

        const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
        return rows.slice(startIndex, startIndex + PAGE_SIZE);
    }, [showFooter, rows, safeCurrentPage]);

    return (
        <div
            className={`bg-surface-panel rounded-2xl border border-border-subtle overflow-hidden ${
                showFooter ? "h-[640px] flex flex-col" : ""
            }`}
        >
            <div
                className={`overflow-auto ${
                    showFooter ? "flex-1 min-h-0" : ""
                } [scrollbar-width:thin] [scrollbar-color:#22313a_#141c21] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-surface-panel [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border-subtle [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-primary/70`}
            >
                <table className="w-full min-w-[960px] text-left border-collapse table-fixed">
                    <colgroup>
                        <col style={{ width: "26%" }} />
                        <col style={{ width: "15%" }} />
                        <col style={{ width: "15%" }} />
                        <col style={{ width: "12%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "8%" }} />
                        <col style={{ width: "14%" }} />
                    </colgroup>
                    <thead className="bg-surface-panel border-b border-border-subtle">
                        <tr>
                            <th className="sticky top-0 z-10 bg-surface-panel text-[11px] font-bold uppercase tracking-wider text-text-muted px-6 py-4">
                                Name
                            </th>
                            <th className="sticky top-0 z-10 bg-surface-panel text-[11px] font-bold uppercase tracking-wider text-text-muted px-6 py-4">
                                Persona
                            </th>
                            <th className="sticky top-0 z-10 bg-surface-panel text-[11px] font-bold uppercase tracking-wider text-text-muted px-6 py-4">
                                Date
                            </th>
                            <th className="sticky top-0 z-10 bg-surface-panel text-[11px] font-bold uppercase tracking-wider text-text-muted px-6 py-4 text-left">
                                Duration
                            </th>
                            <th className="sticky top-0 z-10 bg-surface-panel text-[11px] font-bold uppercase tracking-wider text-text-muted px-6 py-4 text-left">
                                Confidence
                            </th>
                            <th className="sticky top-0 z-10 bg-surface-panel text-[11px] font-bold uppercase tracking-wider text-text-muted px-6 py-4 text-left">
                                Sentiment
                            </th>
                            <th className="sticky top-0 z-10 bg-surface-panel text-[11px] font-bold uppercase tracking-wider text-text-muted px-6 py-4 text-left">
                                Action
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle bg-surface-base/40">
                        {isLoading ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-16">
                                    <div className="flex flex-col items-center justify-center gap-2 text-center">
                                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-border-subtle border-t-primary" />
                                        <p className="text-sm font-semibold text-text-main">
                                            Loading sessions...
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : visibleRows.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-16">
                                    <div className="flex flex-col items-center justify-center gap-2 text-center">
                                        <span className="material-symbols-outlined text-text-muted !text-[28px]">
                                            table_rows
                                        </span>
                                        <p className="text-sm font-semibold text-text-main">
                                            No sessions found
                                        </p>
                                        <p className="text-xs text-text-muted">
                                            Sessions will appear here once
                                            training runs are completed.
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            visibleRows.map((row) => (
                                <tr
                                    key={row.id}
                                    className="border-b border-border-subtle hover:bg-surface-hover transition-colors"
                                >
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-text-main truncate block">
                                            {row.name}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-text-main truncate">
                                        {row.personaId && onViewPersona ? (
                                            <button
                                                onClick={() =>
                                                    onViewPersona(
                                                        row.personaId as string
                                                    )
                                                }
                                                className="text-primary font-semibold hover:text-primary/80 transition-colors truncate"
                                            >
                                                {row.persona}
                                            </button>
                                        ) : (
                                            row.persona
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-text-main">
                                        {formatDate(row.timestamp)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-text-main text-left">
                                        {row.duration}
                                    </td>
                                    <td className="px-6 py-4 text-left">
                                        <span
                                            className={`px-2 py-1 rounded bg-surface-hover font-bold text-xs ${
                                                row.confidence >= 80
                                                    ? "text-success"
                                                    : row.confidence >= 60
                                                      ? "text-primary"
                                                      : "text-danger"
                                            }`}
                                        >
                                            {row.confidence}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-left">
                                        <span
                                            className={`material-symbols-outlined ${
                                                row.sentiment > 0.15
                                                    ? "text-success"
                                                    : row.sentiment >= -0.05
                                                      ? "text-text-main"
                                                      : "text-danger"
                                            }`}
                                            style={{
                                                fontVariationSettings:
                                                    '"FILL" 1',
                                            }}
                                        >
                                            {row.sentiment > 0.15
                                                ? "sentiment_very_satisfied"
                                                : row.sentiment >= -0.05
                                                  ? "sentiment_neutral"
                                                  : "sentiment_dissatisfied"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex w-full items-center justify-start gap-2 whitespace-nowrap">
                                            <button
                                                onClick={() =>
                                                    onViewReport?.(row.id)
                                                }
                                                className="text-primary text-sm font-bold hover:text-primary/80 transition-colors"
                                            >
                                                View Report
                                            </button>
                                            {showDelete && onDelete ? (
                                                <button
                                                    onClick={() =>
                                                        onDelete(row.id)
                                                    }
                                                    className="w-8 h-8 rounded-lg bg-danger/10 text-danger border border-danger/20"
                                                    aria-label="Delete session"
                                                >
                                                    <span className="material-symbols-outlined !text-[16px]">
                                                        delete
                                                    </span>
                                                </button>
                                            ) : null}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showFooter ? (
                <div className="px-6 py-4 border-t border-border-subtle flex items-center justify-between bg-surface-panel">
                    <span className="text-xs text-text-muted font-medium">
                        Showing {paginationRange.start}-{paginationRange.end} of{" "}
                        {resolvedTotalCount} sessions
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() =>
                                setCurrentPage((page) => Math.max(1, page - 1))
                            }
                            disabled={safeCurrentPage === 1}
                            className="p-2 rounded-lg bg-surface-hover text-text-muted hover:text-text-main transition-colors border border-border-subtle disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <span className="material-symbols-outlined">
                                chevron_left
                            </span>
                        </button>
                        <button className="w-8 h-8 rounded-lg bg-primary text-surface-base text-xs font-bold">
                            {safeCurrentPage}
                        </button>
                        <button
                            onClick={() =>
                                setCurrentPage((page) =>
                                    Math.min(totalPages, page + 1)
                                )
                            }
                            disabled={safeCurrentPage >= totalPages}
                            className="p-2 rounded-lg bg-surface-hover text-text-muted hover:text-text-main transition-colors border border-border-subtle disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <span className="material-symbols-outlined">
                                chevron_right
                            </span>
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
