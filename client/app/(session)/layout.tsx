import FullScreenTemplate from "@/components/templates/FullScreenTemplate";

export default function SessionGroupLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <FullScreenTemplate>{children}</FullScreenTemplate>;
}
