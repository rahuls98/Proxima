import SideNavLayout from "@/components/templates/SideNavLayout";

export default function AppLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <SideNavLayout>{children}</SideNavLayout>;
}
