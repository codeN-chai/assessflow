import { Navbar } from "@/components/navbar";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Navbar role="STUDENT" />
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
