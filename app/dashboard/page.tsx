import { redirect } from "next/navigation";
import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { FacebookService } from "@/lib/services/facebook-service";
import { FacebookAdAccount } from "@/lib/types";
import DashboardClient from "./client";

export const metadata: Metadata = {
  title: "Facebook Marketing Dashboard",
  description: "Manage your Facebook Marketing accounts, campaigns, ad sets and ads.",
};

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (!user || userError) {
    redirect("/sign-in");
  }
  
  const facebookService = new FacebookService(supabase);
  let adAccounts: FacebookAdAccount[] = [];
  let databaseError = null;

  try {
    adAccounts = await facebookService.getAdAccounts(user.id);
  } catch (error) {
    console.error("Error fetching ad accounts:", error);
    databaseError = error instanceof Error ? 
      error.message : 
      "There was a problem connecting to the database. Please make sure the required tables are set up.";
  }
  
  return <DashboardClient adAccounts={adAccounts} databaseError={databaseError} />;
}