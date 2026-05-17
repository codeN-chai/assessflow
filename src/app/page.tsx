import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Shield, Zap, BarChart3, Clock } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-white selection:bg-primary/30 font-sans">
      {/* Subtle Background Accent */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
      </div>

      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between px-6 mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-primary-foreground font-bold text-xl">A</span>
            </div>
            <span className="text-xl font-semibold tracking-tight">AssessFlow</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Log in
            </Link>
            <Link href="/signup">
              <Button size="sm" className="rounded-full px-5 bg-white text-black hover:bg-zinc-200 transition-all font-semibold">
                Get Started
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-24 pb-32 md:pt-40 md:pb-56">
          <div className="container px-6 mx-auto text-center">
            <div className="max-w-4xl mx-auto space-y-10">
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-sm">
                Built for the next generation of educators
              </div>
              
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.1]">
                Online Testing <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500">
                  Made Effortless
                </span>
              </h1>
              
              <p className="mx-auto max-w-2xl text-zinc-400 text-lg md:text-xl leading-relaxed">
                Create, conduct, and evaluate tests with precision. Experience the fastest way to manage academic assessments.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link href="/signup">
                  <Button size="lg" className="rounded-full px-8 h-14 text-base font-semibold gap-2 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/10">
                    Start for free <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <Link href="#features">
                  <Button variant="ghost" size="lg" className="rounded-full px-8 h-14 text-base font-semibold text-zinc-400 hover:text-white hover:bg-white/5">
                    Explore features
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-32 border-t border-white/5 bg-gradient-to-b from-black to-[#050505]">
          <div className="container px-6 mx-auto">
            <div className="grid gap-16 lg:grid-cols-2">
              <div className="space-y-8">
                <div className="space-y-4">
                  <span className="text-primary text-sm font-bold tracking-widest uppercase">For Teachers</span>
                  <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Evaluate with power</h2>
                  <p className="text-zinc-400 text-lg">Everything you need to manage your classroom assessments in one place.</p>
                </div>
                
                <div className="grid gap-6">
                  {[
                    { icon: Zap, text: "Magic Paste image integration" },
                    { icon: Clock, text: "Timed tests with auto-submission" },
                    { icon: BarChart3, text: "Real-time analytics and scoring" },
                    { icon: Shield, text: "Secure role-based access control" }
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                      <f.icon className="size-5 text-primary" />
                      <span className="font-medium">{f.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <span className="text-primary text-sm font-bold tracking-widest uppercase">For Students</span>
                  <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Focus on success</h2>
                  <p className="text-zinc-400 text-lg">A distraction-free environment designed for peak performance.</p>
                </div>
                
                <div className="grid gap-6">
                  {[
                    { icon: ArrowRight, text: "Instant join with 6-digit code" },
                    { icon: CheckCircle2, text: "Auto-saving prevents data loss" },
                    { icon: Zap, text: "Clean, lightning-fast interface" },
                    { icon: BarChart3, text: "Instant results upon completion" }
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                      <f.icon className="size-5 text-primary" />
                      <span className="font-medium">{f.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-12 bg-black">
        <div className="container px-6 mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold text-xs">A</span>
            </div>
            <span className="font-bold tracking-tight text-zinc-300">AssessFlow</span>
          </div>
          <p className="text-sm text-zinc-500">
            © {new Date().getFullYear()} AssessFlow. The future of academic evaluation.
          </p>
        </div>
      </footer>
    </div>
  );
}
