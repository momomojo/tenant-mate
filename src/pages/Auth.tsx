import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Building2, ArrowLeft, Shield, Zap, Users } from "lucide-react";
import { motion } from "framer-motion";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['admin', 'property_manager', 'tenant'] as const).optional(),
});

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">(
    searchParams.get("mode") === "signup" ? "signup" : "signin"
  );
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      role: "tenant",
    },
  });

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          navigate("/dashboard");
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleAuthError = (error: { message: string }) => {
    if (error.message.includes('Database error saving new user')) {
      toast({
        variant: "destructive",
        title: "Registration Error",
        description: "There was a problem with the database. Please try again later or contact support.",
      });
    } else if (error.message.includes('email_not_confirmed') || error.message.includes('Email not confirmed')) {
      toast({
        variant: "destructive",
        title: "Email Not Verified",
        description: "Please check your email and click the verification link before signing in.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      if (mode === "signup") {
        const cleanedData = {
          first_name: values.firstName || "",
          last_name: values.lastName || "",
          role: values.role || "tenant"
        };

        const userData = {
          email: values.email,
          password: values.password,
          options: {
            data: cleanedData
          },
        };

        const { data, error } = await supabase.auth.signUp(userData);

        if (error) throw error;

        toast({
          title: "Success!",
          description: "Please check your email to verify your account before signing in.",
        });
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
        if (error) throw error;
      }
    } catch (error: unknown) {
      handleAuthError(error as { message: string });
    } finally {
      setIsLoading(false);
    }
  };

  const highlights = [
    { icon: Shield, text: "Secure & encrypted" },
    { icon: Zap, text: "Real-time updates" },
    { icon: Users, text: "Multi-role access" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-indigo/20 via-brand-purple/10 to-transparent" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-brand-indigo/10 rounded-full blur-[100px]" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-3 group w-fit"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-brand-indigo to-brand-purple shadow-glow-sm">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">TenantMate</span>
          </button>

          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white tracking-tight leading-tight">
              Property management,{" "}
              <span className="gradient-text">reimagined.</span>
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed max-w-sm">
              Everything you need to manage properties, communicate with tenants, and track finances in one platform.
            </p>

            <div className="space-y-3 pt-4">
              {highlights.map((item) => (
                <div key={item.text} className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08]">
                    <item.icon className="h-4 w-4 text-brand-indigo-light" />
                  </div>
                  <span className="text-sm text-gray-300">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground/50">
            Trusted by property managers everywhere
          </p>
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden p-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-8 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-[400px] space-y-8"
          >
            {/* Mobile logo */}
            <div className="lg:hidden flex justify-center mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-brand-indigo to-brand-purple shadow-glow-sm">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">TenantMate</span>
              </div>
            </div>

            <div className="text-center lg:text-left">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {mode === "signin" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                {mode === "signin"
                  ? "Enter your credentials to access your account"
                  : "Sign up to get started with TenantMate"}
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {mode === "signup" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium text-muted-foreground">First Name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-muted-foreground/50 focus:border-brand-indigo/50 focus:ring-brand-indigo/20 rounded-xl h-11"
                                placeholder="John"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium text-muted-foreground">Last Name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-muted-foreground/50 focus:border-brand-indigo/50 focus:ring-brand-indigo/20 rounded-xl h-11"
                                placeholder="Doe"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-muted-foreground">Role</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white focus:border-brand-indigo/50 focus:ring-brand-indigo/20 rounded-xl h-11">
                                <SelectValue placeholder="Select your role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-surface-elevated border-white/[0.08]">
                              <SelectItem value="tenant">Tenant</SelectItem>
                              <SelectItem value="property_manager">Property Manager</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-muted-foreground">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          {...field}
                          className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-muted-foreground/50 focus:border-brand-indigo/50 focus:ring-brand-indigo/20 rounded-xl h-11"
                          placeholder="you@example.com"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-muted-foreground">Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          {...field}
                          className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-muted-foreground/50 focus:border-brand-indigo/50 focus:ring-brand-indigo/20 rounded-xl h-11"
                          placeholder="Min. 6 characters"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-brand-indigo hover:bg-brand-indigo-light text-white rounded-xl h-11 font-medium shadow-glow hover:shadow-[0_0_25px_rgba(99,102,241,0.3)] transition-all duration-300 mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                      <span>Processing...</span>
                    </div>
                  ) : mode === "signin" ? "Sign In" : "Create Account"}
                </Button>
              </form>
            </Form>

            <div className="text-center">
              <button
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="text-sm text-muted-foreground hover:text-white transition-colors duration-200"
              >
                {mode === "signin"
                  ? "Don't have an account? "
                  : "Already have an account? "}
                <span className="text-brand-indigo-light font-medium">
                  {mode === "signin" ? "Sign up" : "Sign in"}
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
