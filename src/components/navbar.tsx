"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEffect, useState } from "react";

export function Navbar({ role }: { role: "TEACHER" | "STUDENT" }) {
  const router = useRouter();
  const supabase = createClient();
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        if (data) {
          setUserName(data.full_name);
        }
      }
    }
    getUser();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-8">
          <Link href={role === "TEACHER" ? "/teacher" : "/student"} className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">A</span>
            </div>
            <span className="text-xl font-bold tracking-tight hidden sm:inline-block">AssessFlow</span>
            <span className="text-xs font-medium bg-muted px-2 py-1 rounded-full text-muted-foreground ml-1">
              {role === "TEACHER" ? "Teacher" : "Student"}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href={role === "TEACHER" ? "/teacher" : "/student"} className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              Dashboard
            </Link>
            {role === "STUDENT" && (
              <Link href="/student/notes" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                Study Vault
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-full mr-2">
            <UserIcon className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">{userName || "User"}</span>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive gap-2"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
