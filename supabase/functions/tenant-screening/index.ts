// Tenant Screening Edge Function
// This Edge Function handles tenant background and credit checks
// It integrates with screening providers (mock implementation - replace with real provider)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScreeningRequest {
  applicant_id: string;
  screening_type: "credit" | "background" | "eviction" | "income" | "full";
}

interface ScreeningResult {
  credit_score?: number;
  credit_report?: Record<string, unknown>;
  background_check?: Record<string, unknown>;
  eviction_history?: Record<string, unknown>;
  income_verification?: Record<string, unknown>;
  recommendation: "approve" | "review" | "deny";
  flags: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Also create a client with user's token for RLS
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Parse request body
    const { applicant_id, screening_type = "full" }: ScreeningRequest = await req.json();

    if (!applicant_id) {
      return new Response(
        JSON.stringify({ error: "applicant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user has access to this applicant (RLS check)
    const { data: applicant, error: applicantError } = await supabaseClient
      .from("applicants")
      .select(`
        *,
        property:properties!inner(id, name, created_by, property_manager_id)
      `)
      .eq("id", applicant_id)
      .single();

    if (applicantError || !applicant) {
      return new Response(
        JSON.stringify({ error: "Applicant not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update applicant status to screening
    await supabase
      .from("applicants")
      .update({ status: "screening", updated_at: new Date().toISOString() })
      .eq("id", applicant_id);

    // Perform screening (MOCK IMPLEMENTATION)
    // In production, replace with actual screening provider API calls
    // Common providers: TransUnion SmartMove, Experian, RentPrep, etc.
    const screeningResult = await performMockScreening(applicant, screening_type);

    // Create screening report record
    const { data: report, error: reportError } = await supabase
      .from("screening_reports")
      .insert({
        applicant_id,
        provider: "mock_provider", // Replace with actual provider name
        provider_order_id: `MOCK-${Date.now()}`,
        credit_score: screeningResult.credit_score,
        credit_report: screeningResult.credit_report,
        background_check: screeningResult.background_check,
        eviction_history: screeningResult.eviction_history,
        income_verification: screeningResult.income_verification,
        recommendation: screeningResult.recommendation,
        flags: screeningResult.flags,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (reportError) {
      console.error("Error creating screening report:", reportError);
      throw reportError;
    }

    // Update applicant with screening result summary
    await supabase
      .from("applicants")
      .update({
        screening_recommendation: screeningResult.recommendation,
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicant_id);

    // Create notification for property owner
    const { data: authUser } = await supabaseClient.auth.getUser();
    await supabase.from("notifications").insert({
      user_id: applicant.property.created_by,
      title: "Screening Complete",
      message: `Screening for ${applicant.first_name} ${applicant.last_name} is complete. Recommendation: ${screeningResult.recommendation.toUpperCase()}`,
      type: "screening",
      data: {
        applicant_id,
        report_id: report.id,
        recommendation: screeningResult.recommendation,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        report_id: report.id,
        recommendation: screeningResult.recommendation,
        flags: screeningResult.flags,
        message: "Screening completed successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Screening error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Screening failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Mock screening function - Replace with actual provider integration
async function performMockScreening(
  applicant: Record<string, unknown>,
  screeningType: string
): Promise<ScreeningResult> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const flags: string[] = [];
  let recommendation: "approve" | "review" | "deny" = "approve";

  // Generate mock credit data
  const creditScore = Math.floor(Math.random() * 300) + 550; // 550-850
  const creditReport = {
    score: creditScore,
    score_date: new Date().toISOString(),
    tradelines: [
      { type: "credit_card", balance: 2500, limit: 10000, status: "current" },
      { type: "auto_loan", balance: 15000, limit: 25000, status: "current" },
    ],
    inquiries_last_6_months: Math.floor(Math.random() * 5),
    collections: Math.floor(Math.random() * 2),
    bankruptcies: 0,
    public_records: [],
  };

  // Analyze credit score
  if (creditScore < 600) {
    flags.push("Low credit score");
    recommendation = "review";
  } else if (creditScore < 550) {
    flags.push("Very low credit score");
    recommendation = "deny";
  }

  // Generate mock background check
  const backgroundCheck = {
    criminal_records: [],
    sex_offender_registry: false,
    terrorist_watchlist: false,
    global_sanctions: false,
    identity_verified: true,
    ssn_verified: true,
  };

  // Random chance of finding something in background
  if (Math.random() < 0.1) {
    backgroundCheck.criminal_records = [
      {
        type: "misdemeanor",
        description: "Minor traffic violation",
        date: "2019-03-15",
        disposition: "paid",
      },
    ];
    flags.push("Criminal record found (minor)");
    if (recommendation === "approve") recommendation = "review";
  }

  // Generate mock eviction history
  const evictionHistory = {
    records: [],
    landlord_references: [
      {
        name: "Previous Landlord",
        phone: "555-0100",
        relationship: "landlord",
        years: 2,
        rating: "good",
        would_rent_again: true,
      },
    ],
  };

  // Random chance of eviction history
  if (Math.random() < 0.05) {
    evictionHistory.records = [
      {
        date: "2018-06-01",
        reason: "Non-payment",
        amount: 3500,
        status: "resolved",
      },
    ];
    flags.push("Previous eviction found");
    recommendation = "review";
  }

  // Generate mock income verification
  const monthlyRent = (applicant.desired_rent as number) || 1500;
  const monthlyIncome = Math.floor(monthlyRent * (2.5 + Math.random() * 2)); // 2.5x to 4.5x rent
  const incomeVerification = {
    reported_income: monthlyIncome,
    verified_income: monthlyIncome,
    employment_verified: true,
    employer: "Acme Corporation",
    position: "Software Developer",
    years_employed: Math.floor(Math.random() * 10) + 1,
    income_to_rent_ratio: monthlyIncome / monthlyRent,
  };

  // Check income-to-rent ratio
  if (incomeVerification.income_to_rent_ratio < 3) {
    flags.push("Income-to-rent ratio below 3x");
    if (recommendation === "approve") recommendation = "review";
  } else if (incomeVerification.income_to_rent_ratio < 2.5) {
    flags.push("Income-to-rent ratio below 2.5x");
    recommendation = "deny";
  }

  return {
    credit_score: creditScore,
    credit_report: screeningType === "credit" || screeningType === "full" ? creditReport : undefined,
    background_check: screeningType === "background" || screeningType === "full" ? backgroundCheck : undefined,
    eviction_history: screeningType === "eviction" || screeningType === "full" ? evictionHistory : undefined,
    income_verification: screeningType === "income" || screeningType === "full" ? incomeVerification : undefined,
    recommendation,
    flags,
  };
}
