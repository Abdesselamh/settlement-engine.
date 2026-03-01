import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Shield, FileCheck, AlertTriangle, CheckCircle, Clock, Building2, CreditCard, Globe, Lock, ChevronRight, Upload } from "lucide-react";

const DOCUMENT_TYPES = [
  { value: "passport", label: "Passport" },
  { value: "national_id", label: "National ID Card" },
  { value: "drivers_license", label: "Driver's License" },
];

function StatusCard({ status }: { status: string }) {
  const config = {
    not_submitted: { icon: FileCheck, color: "text-muted-foreground", bg: "bg-white/5", label: "Not Submitted", desc: "Complete your KYC to unlock full platform access." },
    pending: { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10", label: "Under Review", desc: "Your documents are being verified. Typically 1-2 business days." },
    approved: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10", label: "Verified", desc: "Your identity has been verified. Full access enabled." },
    rejected: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10", label: "Rejected", desc: "Your submission was rejected. Please resubmit with valid documents." },
  }[status] || { icon: Clock, color: "text-muted-foreground", bg: "bg-white/5", label: status, desc: "" };

  const Icon = config.icon;
  return (
    <div className={`glass-panel rounded-2xl p-6 border border-white/5 ${config.bg} mb-8`}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl ${config.bg} border border-white/10 flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${config.color}`} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">KYC Status</p>
          <p className={`text-xl font-bold ${config.color}`}>{config.label}</p>
          <p className="text-sm text-muted-foreground mt-1">{config.desc}</p>
        </div>
      </div>
    </div>
  );
}

export default function Compliance() {
  const { toast } = useToast();
  const userEmail = typeof window !== 'undefined' ? localStorage.getItem("user_email") || "demo@instantsettlement.ai" : "demo@instantsettlement.ai";

  const [form, setForm] = useState({
    userEmail, fullName: "", dateOfBirth: "", nationality: "",
    documentType: "", documentNumber: "", companyName: "", companyRegNumber: "", regulatoryBody: "",
  });

  const { data: kycStatus, refetch } = useQuery<any>({
    queryKey: ["/api/kyc/status", userEmail],
    queryFn: () => fetch(`/api/kyc/status/${encodeURIComponent(userEmail)}`).then(r => r.json()),
  });

  const submitMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/kyc/submit", data),
    onSuccess: () => {
      toast({ title: "KYC Submitted", description: "Your documents are under review. We'll notify you within 1-2 business days." });
      refetch();
    },
    onError: (e: any) => toast({ title: "Submission Failed", description: e.message, variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.dateOfBirth || !form.nationality || !form.documentType || !form.documentNumber) {
      toast({ title: "Missing Fields", description: "Please complete all required fields.", variant: "destructive" });
      return;
    }
    submitMutation.mutate(form);
  };

  const canSubmit = !kycStatus || kycStatus.status === "not_submitted" || kycStatus.status === "rejected";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-medium mb-4">
              <Shield className="w-4 h-4" />
              <span>Compliance Center</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-3">KYC Verification</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Know Your Customer (KYC) verification is required for all institutional accounts. 
              Complete verification to unlock full settlement capabilities.
            </p>
          </div>

          <StatusCard status={kycStatus?.status || "not_submitted"} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: KYC Form */}
            <div className="lg:col-span-2">
              {canSubmit ? (
                <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-8 border border-white/5 space-y-6">
                  <h2 className="text-xl font-bold text-white">Identity Verification</h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">Full Legal Name *</Label>
                      <Input data-testid="input-full-name" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="As on official documents" className="bg-white/5 border-white/10 text-white" />
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">Date of Birth *</Label>
                      <Input data-testid="input-dob" type="date" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">Nationality *</Label>
                      <Input data-testid="input-nationality" value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} placeholder="e.g., United States" className="bg-white/5 border-white/10 text-white" />
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">Document Type *</Label>
                      <Select value={form.documentType} onValueChange={v => setForm(f => ({ ...f, documentType: v }))}>
                        <SelectTrigger data-testid="select-doc-type" className="bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder="Select document" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0d1117] border-white/10">
                          {DOCUMENT_TYPES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-sm text-muted-foreground mb-2 block">Document Number *</Label>
                      <Input data-testid="input-doc-number" value={form.documentNumber} onChange={e => setForm(f => ({ ...f, documentNumber: e.target.value }))} placeholder="As printed on document" className="bg-white/5 border-white/10 text-white" />
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-6">
                    <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" /> Institutional Details (Optional)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">Company Name</Label>
                        <Input data-testid="input-company-name" value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} placeholder="Registered entity name" className="bg-white/5 border-white/10 text-white" />
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">Registration Number</Label>
                        <Input data-testid="input-company-reg" value={form.companyRegNumber} onChange={e => setForm(f => ({ ...f, companyRegNumber: e.target.value }))} placeholder="Company registration #" className="bg-white/5 border-white/10 text-white" />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-sm text-muted-foreground mb-2 block">Regulatory Body</Label>
                        <Input data-testid="input-regulatory" value={form.regulatoryBody} onChange={e => setForm(f => ({ ...f, regulatoryBody: e.target.value }))} placeholder="e.g., SEC, FCA, BaFin, MAS" className="bg-white/5 border-white/10 text-white" />
                      </div>
                    </div>
                  </div>

                  <div className="border border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center gap-3 bg-white/[0.02]">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground text-center">
                      Document upload coming soon — secure storage via encrypted vault.<br/>
                      <span className="text-primary">Placeholder for Plaid/Open Banking integration.</span>
                    </p>
                  </div>

                  <Button data-testid="button-submit-kyc" type="submit" disabled={submitMutation.isPending} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    {submitMutation.isPending ? "Submitting..." : "Submit KYC Application"}
                  </Button>
                </form>
              ) : (
                <div className="glass-panel rounded-2xl p-8 border border-white/5">
                  <h2 className="text-xl font-bold text-white mb-4">Submission Details</h2>
                  {kycStatus && (
                    <div className="space-y-3">
                      {[
                        ["Full Name", kycStatus.fullName],
                        ["Nationality", kycStatus.nationality],
                        ["Document Type", kycStatus.documentType],
                        ["Document Number", kycStatus.documentNumber],
                        ["Company", kycStatus.companyName || "N/A"],
                        ["Submitted", new Date(kycStatus.submittedAt).toLocaleDateString()],
                        ...(kycStatus.reviewNotes ? [["Review Notes", kycStatus.reviewNotes]] : []),
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between py-2 border-b border-white/5">
                          <span className="text-muted-foreground text-sm">{k}</span>
                          <span className="text-white text-sm font-medium">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Info Sidebar */}
            <div className="space-y-4">
              <div className="glass-panel rounded-2xl p-6 border border-white/5">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Verification Tiers</h3>
                {[
                  { label: "Basic KYC", desc: "Identity + Document check", icon: "🪪", active: true },
                  { label: "Enhanced DD", desc: "Source of funds verification", icon: "🏛️", active: false },
                  { label: "Open Banking", desc: "Plaid direct bank link", icon: "🔗", active: false },
                ].map(tier => (
                  <div key={tier.label} className={`flex items-center gap-3 p-3 rounded-xl mb-2 ${tier.active ? 'bg-primary/10 border border-primary/20' : 'bg-white/[0.02] border border-white/5'}`}>
                    <span className="text-xl">{tier.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{tier.label}</p>
                      <p className="text-xs text-muted-foreground">{tier.desc}</p>
                    </div>
                    {tier.active ? <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">Active</Badge> : <Badge variant="outline" className="text-xs text-muted-foreground">Coming</Badge>}
                  </div>
                ))}
              </div>

              <div className="glass-panel rounded-2xl p-6 border border-white/5">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Plaid Integration</h3>
                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-white">Open Banking API</span>
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">Planned</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Direct bank verification via Plaid Link for instant account ownership confirmation across 12,000+ institutions.</p>
                </div>
                <Button data-testid="button-plaid-demo" variant="outline" className="w-full border-white/10 text-muted-foreground hover:text-white" disabled>
                  <Lock className="w-4 h-4 mr-2" /> Connect Bank Account
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">Enterprise tier required</p>
              </div>

              <div className="glass-panel rounded-2xl p-6 border border-white/5">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Compliance Standards</h3>
                {["AML/BSA", "FATF Recommendations", "MiFID II", "Basel III", "GDPR/CCPA"].map(s => (
                  <div key={s} className="flex items-center gap-2 py-2">
                    <CheckCircle className="w-3 h-3 text-primary flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
