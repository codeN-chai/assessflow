"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;
    const role = formData.get("role") as string;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      toast.success("Account created! You can now log in.");
      router.push("/login");
    }
  };

  return (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Enter your details below to create your account
        </p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4 mt-8">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input id="fullName" name="fullName" placeholder="John Doe" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="m@example.com" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required />
        </div>
        
        <div className="space-y-3 pt-2">
          <Label>I am a...</Label>
          <RadioGroup defaultValue="STUDENT" name="role" className="flex flex-col space-y-1">
            <div className="flex items-center space-x-3 space-y-0 border rounded-md p-3">
              <RadioGroupItem value="STUDENT" id="student" />
              <Label htmlFor="student" className="font-normal cursor-pointer w-full">Student</Label>
            </div>
            <div className="flex items-center space-x-3 space-y-0 border rounded-md p-3">
              <RadioGroupItem value="TEACHER" id="teacher" />
              <Label htmlFor="teacher" className="font-normal cursor-pointer w-full">Teacher</Label>
            </div>
          </RadioGroup>
        </div>

        <Button className="w-full mt-4" type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
          Sign Up
        </Button>
      </form>

      <div className="text-center mt-6">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </>
  );
}
