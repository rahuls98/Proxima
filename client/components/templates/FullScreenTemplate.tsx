export default function FullScreenTemplate({
    children,
}: {
    children: React.ReactNode;
}) {
    return <div className="min-h-screen w-full bg-white">{children}</div>;
}
