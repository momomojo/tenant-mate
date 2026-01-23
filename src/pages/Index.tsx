import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Building2, ArrowRight, Shield, MessageSquare, Wrench, CreditCard, BarChart3, Users } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: MessageSquare,
    title: "Smart Messaging",
    description: "Seamless communication between tenants and managers with real-time notifications.",
    gradient: "from-brand-indigo/20 to-brand-indigo/5",
    iconColor: "text-brand-indigo-light",
  },
  {
    icon: Wrench,
    title: "Maintenance Tracking",
    description: "Submit, track, and resolve maintenance requests with status updates.",
    gradient: "from-brand-purple/20 to-brand-purple/5",
    iconColor: "text-brand-purple-light",
  },
  {
    icon: CreditCard,
    title: "Secure Payments",
    description: "Process rent payments securely with Stripe integration and auto-receipts.",
    gradient: "from-status-success/20 to-status-success/5",
    iconColor: "text-status-success",
  },
  {
    icon: BarChart3,
    title: "Financial Reports",
    description: "Comprehensive rent rolls, income reports, and property summaries.",
    gradient: "from-brand-blue/20 to-brand-blue/5",
    iconColor: "text-brand-blue",
  },
  {
    icon: Shield,
    title: "Lease Management",
    description: "Digital lease agreements with tracking, renewals, and document storage.",
    gradient: "from-status-warning/20 to-status-warning/5",
    iconColor: "text-status-warning",
  },
  {
    icon: Users,
    title: "Tenant Screening",
    description: "Applicant tracking workflow from invitation to approved tenant.",
    gradient: "from-pink-500/20 to-pink-500/5",
    iconColor: "text-pink-400",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-brand-indigo/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-brand-indigo to-brand-purple shadow-glow-sm">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">TenantMate</span>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/auth")}
          className="border-white/[0.12] bg-white/[0.04] text-white hover:bg-white/[0.08] hover:border-white/[0.2] transition-all duration-200"
        >
          Sign In
        </Button>
      </nav>

      {/* Hero Section */}
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 container mx-auto px-4 pt-16 pb-20 sm:pt-24 sm:pb-28"
      >
        <motion.div variants={itemVariants} className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-indigo/10 border border-brand-indigo/20 text-xs font-medium text-brand-indigo-light mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-indigo animate-pulse-soft" />
            Property Management, Simplified
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight leading-[1.1]">
            Manage Properties{" "}
            <span className="gradient-text">Effortlessly</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Streamline communication, maintenance requests, and payments all in one place.
            The complete solution for property managers and tenants.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate("/auth?mode=signup")}
              className="bg-brand-indigo hover:bg-brand-indigo-light text-white px-8 py-6 text-base rounded-xl shadow-glow hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] transition-all duration-300"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/auth")}
              className="border-white/[0.12] bg-white/[0.04] text-white hover:bg-white/[0.08] px-8 py-6 text-base rounded-xl transition-all duration-200"
            >
              Sign In
            </Button>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-24 max-w-5xl mx-auto"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="group relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/[0.08] p-6 hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-300 card-hover-lift"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <div className="relative z-10">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] mb-4 group-hover:border-white/[0.12] transition-colors duration-300">
                  <feature.icon className={`h-5 w-5 ${feature.iconColor}`} />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Section */}
        <motion.div
          variants={itemVariants}
          className="mt-24 max-w-2xl mx-auto text-center"
        >
          <div className="rounded-2xl bg-gradient-to-br from-brand-indigo/10 to-brand-purple/10 border border-white/[0.08] p-8 sm:p-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
              Ready to get started?
            </h2>
            <p className="text-muted-foreground mb-6">
              Join property managers who trust TenantMate to streamline operations.
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/auth?mode=signup")}
              className="bg-brand-indigo hover:bg-brand-indigo-light text-white px-8 rounded-xl shadow-glow hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] transition-all duration-300"
            >
              Create Free Account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </motion.main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-8">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">TenantMate</span>
          </div>
          <p className="text-xs text-muted-foreground/60">
            Built for modern property management
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
