import FullScreenLayout from "@/components/templates/FullScreenLayout";

export default function SessionLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <FullScreenLayout>{children}</FullScreenLayout>;
}
