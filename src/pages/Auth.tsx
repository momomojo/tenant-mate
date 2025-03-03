
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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Home } from "lucide-react";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required").optional().or(z.literal('')),
  lastName: z.string().min(1, "Last name is required").optional().or(z.literal('')),
  role: z.enum(['admin', 'property_manager', 'tenant']).optional(),
});

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">(
    searchParams.get("mode") === "signup" ? "signup" : "signin"
  );
  const navigate = useNavigate();

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
    // Check if user is already logged in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    
    checkSession();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          navigate("/dashboard");
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleAuthError = (error: any) => {
    console.error("Auth error:", error);
    
    if (error.message.includes('email_not_confirmed') || error.message.includes('Email not confirmed')) {
      toast.error("Email Not Verified - Please check your email and click the verification link before signing in.");
    } else if (error.message.includes('Invalid login credentials')) {
      toast.error("Invalid email or password. Please try again.");
    } else if (error.message.includes('User already registered')) {
      toast.error("This email is already registered. Please sign in instead.");
      setMode("signin");
    } else {
      toast.error(error.message || "An error occurred during authentication");
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      if (mode === "signup") {
        // Validate required fields for signup
        if (!values.firstName || !values.lastName) {
          toast.error("First name and last name are required for signup");
          setIsLoading(false);
          return;
        }
        
        // Ensure role is one of the valid enum values
        const role = values.role || 'tenant';
        
        const { data, error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            data: {
              first_name: values.firstName,
              last_name: values.lastName,
              role: role, // Send as a string - will be cast to enum in database function
            },
            emailRedirectTo: `${window.location.origin}/auth?mode=signin`,
          },
        });
        
        if (error) throw error;
        
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          toast.error("This email is already registered. Please sign in instead.");
          setMode("signin");
        } else {
          toast.success("Success! Please check your email to verify your account before signing in.");
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
        
        if (error) throw error;
        
        // Successful login will be handled by the auth state change listener
        toast.success("Login successful!");
      }
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="container mx-auto px-4 py-6">
        <Button
          variant="ghost"
          className="flex items-center gap-2"
          onClick={() => navigate("/")}
        >
          <Home className="h-4 w-4" />
          TenantMate
        </Button>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-muted-foreground mt-2">
              {mode === "signin"
                ? "Enter your credentials to access your account"
                : "Sign up to get started with TenantMate"}
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {mode === "signup" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                        <FormLabel>Role</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="tenant">Tenant</SelectItem>
                            <SelectItem value="property_manager">
                              Property Manager
                            </SelectItem>
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading
                  ? "Loading..."
                  : mode === "signin"
                  ? "Sign In"
                  : "Sign Up"}
              </Button>
            </form>
          </Form>

          <div className="text-center">
            <Button
              variant="link"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin"
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
