export default function AppLoading() {
    return (
        <div className="flex-1 p-8 flex items-center justify-center bg-surface-base">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-2 border-border-subtle border-t-primary mb-4" />
                <p className="text-text-muted">Loading...</p>
            </div>
        </div>
    );
}
