export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          {children}
        </div>
      </div>
      <div className="hidden lg:flex flex-col justify-center items-center bg-muted/30 border-l p-12">
        <div className="max-w-md space-y-6 text-center">
          <div className="mx-auto size-16 rounded-2xl bg-primary flex items-center justify-center mb-8">
            <span className="text-primary-foreground font-bold text-3xl">A</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight">AssessFlow</h2>
          <p className="text-muted-foreground text-lg">
            A modern, robust platform for seamless online assessments. Join thousands of educators and students today.
          </p>
        </div>
      </div>
    </div>
  );
}
