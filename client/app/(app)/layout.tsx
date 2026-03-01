import SideNavTemplate from "@/components/templates/SideNavTemplate";

export default function AppLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <SideNavTemplate>{children}</SideNavTemplate>;
}
