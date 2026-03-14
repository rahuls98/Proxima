export default function FullScreenTemplate({
    children,
}: {
    children: React.ReactNode;
}) {
    return <div className="h-full w-full bg-surface-base">{children}</div>;
}
