import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Code2, Key, Webhook, Copy, CheckCircle, Plus, Trash2, Activity, Globe, Lock, Zap, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const DEMO_EMAIL = "admin@instantsettlement.ai";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1 text-muted-foreground hover:text-primary transition-colors" data-testid="button-copy">
      {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

function CodeBlock({ code, lang = "json" }: { code: string; lang?: string }) {
  return (
    <div className="relative bg-black/40 rounded-xl border border-white/10 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-white/5">
        <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500/60" /><div className="w-3 h-3 rounded-full bg-yellow-500/60" /><div className="w-3 h-3 rounded-full bg-green-500/60" /></div>
        <span className="text-xs text-muted-foreground font-mono ml-2">{lang}</span>
        <div className="ml-auto"><CopyButton text={code} /></div>
      </div>
      <pre className="p-4 text-sm text-green-300/90 font-mono overflow-x-auto whitespace-pre-wrap">{code}</pre>
    </div>
  );
}

export default function DeveloperHub() {
  const { toast } = useToast();
  const [showNewKey, setShowNewKey] = useState(false);
  const [showNewWebhook, setShowNewWebhook] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPerms, setNewKeyPerms] = useState("read");
  const [newWebhookName, setNewWebhookName] = useState("");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookEvents, setNewWebhookEvents] = useState("settlement.completed");
  const [revealedKey, setRevealedKey] = useState<{ raw: string; name: string } | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<{ secret: string; name: string } | null>(null);

  const { data: apiKeys = [], isLoading: keysLoading } = useQuery<any[]>({
    queryKey: ["/api/developer/keys"],
    queryFn: () => fetch(`/api/developer/keys?email=${DEMO_EMAIL}`).then(r => r.json()),
  });

  const { data: webhooks = [], isLoading: hooksLoading } = useQuery<any[]>({
    queryKey: ["/api/developer/webhooks"],
    queryFn: () => fetch(`/api/developer/webhooks?email=${DEMO_EMAIL}`).then(r => r.json()),
  });

  const { data: fxRates } = useQuery<any>({ queryKey: ["/api/fx/rates"] });

  const createKeyMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/developer/keys", { userEmail: DEMO_EMAIL, name: newKeyName, permissions: newKeyPerms }),
    onSuccess: async (res: any) => {
      const data = await res.json();
      setRevealedKey({ raw: data.rawKey, name: data.name });
      setShowNewKey(false);
      setNewKeyName("");
      queryClient.invalidateQueries({ queryKey: ["/api/developer/keys"] });
    },
    onError: (e: any) => toast({ title: "Failed to create key", description: e.message, variant: "destructive" }),
  });

  const revokeKeyMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/developer/keys/${id}`),
    onSuccess: () => {
      toast({ title: "API Key Revoked", description: "The key has been permanently disabled." });
      queryClient.invalidateQueries({ queryKey: ["/api/developer/keys"] });
    },
  });

  const createWebhookMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/developer/webhooks", { userEmail: DEMO_EMAIL, name: newWebhookName, url: newWebhookUrl, events: newWebhookEvents }),
    onSuccess: async (res: any) => {
      const data = await res.json();
      setRevealedSecret({ secret: data.signingSecret, name: data.name });
      setShowNewWebhook(false);
      setNewWebhookName("");
      setNewWebhookUrl("");
      queryClient.invalidateQueries({ queryKey: ["/api/developer/webhooks"] });
    },
    onError: async (e: any) => {
      const data = await (e as any).response?.json().catch(() => ({}));
      toast({ title: "Failed to create webhook", description: data?.message || e.message, variant: "destructive" });
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/developer/webhooks/${id}`),
    onSuccess: () => {
      toast({ title: "Webhook Deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/developer/webhooks"] });
    },
  });

  const sampleSettlementPayload = JSON.stringify({
    event: "settlement.completed",
    timestamp: "2026-03-01T12:00:00.000Z",
    data: {
      txId: "SET-1001",
      amount: "5000000.00",
      currency: "USD",
      sender: "JPMorgan Chase",
      receiver: "Goldman Sachs",
      status: "Settled",
      latencyMs: "0.85",
      riskScore: "Low"
    }
  }, null, 2);

  const curlExample = `curl -X GET "https://api.instantsettlement.ai/api/v1/transactions" \\
  -H "Authorization: Bearer isk_live_YOUR_KEY_HERE" \\
  -H "Content-Type: application/json"`;

  const curlPost = `curl -X POST "https://api.instantsettlement.ai/api/v1/transactions" \\
  -H "Authorization: Bearer isk_live_YOUR_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": "5000000",
    "currency": "USD",
    "sender": "JPMorgan Chase",
    "receiver": "Goldman Sachs",
    "latencyMs": "0.85"
  }'`;

  const verifySignature = `const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = 'sha256=' + 
    crypto.createHmac('sha256', secret)
           .update(payload)
           .digest('hex');
  return signature === expected;
}

// In your Express handler:
app.post('/webhook', (req, res) => {
  const sig = req.headers['x-instantsettlement-signature'];
  const isValid = verifyWebhook(
    JSON.stringify(req.body), sig, process.env.WEBHOOK_SECRET
  );
  if (!isValid) return res.status(401).send('Unauthorized');
  const { event, data } = req.body;
  console.log('Event:', event, data.txId);
  res.json({ received: true });
});`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Code2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white" data-testid="text-developer-hub-title">Developer Hub</h1>
                <p className="text-muted-foreground text-sm">REST API v1.0 · Webhook System · Multi-currency FX</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {[{ icon: Shield, label: "AES-256 Encrypted", color: "text-green-400" }, { icon: Zap, label: "Sub-1ms Latency", color: "text-yellow-400" }, { icon: Globe, label: "Global Multi-currency", color: "text-blue-400" }, { icon: Lock, label: "HMAC Signed Webhooks", color: "text-purple-400" }].map(({ icon: Icon, label, color }) => (
                <div key={label} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <Tabs defaultValue="keys">
            <TabsList className="mb-6 bg-white/5 border border-white/10">
              <TabsTrigger value="keys" className="data-[state=active]:bg-primary/10" data-testid="tab-api-keys">
                <Key className="w-4 h-4 mr-2" /> API Keys
              </TabsTrigger>
              <TabsTrigger value="webhooks" className="data-[state=active]:bg-primary/10" data-testid="tab-webhooks">
                <Webhook className="w-4 h-4 mr-2" /> Webhooks
              </TabsTrigger>
              <TabsTrigger value="reference" className="data-[state=active]:bg-primary/10" data-testid="tab-api-reference">
                <Code2 className="w-4 h-4 mr-2" /> API Reference
              </TabsTrigger>
              <TabsTrigger value="fx" className="data-[state=active]:bg-primary/10" data-testid="tab-fx-rates">
                <Activity className="w-4 h-4 mr-2" /> FX Rates
              </TabsTrigger>
            </TabsList>

            {/* === API KEYS === */}
            <TabsContent value="keys">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">API Keys</h2>
                  <p className="text-sm text-muted-foreground">Keys are hashed (SHA-256) before storage. Raw keys shown once only.</p>
                </div>
                <Button onClick={() => setShowNewKey(true)} className="gap-2" data-testid="button-new-api-key">
                  <Plus className="w-4 h-4" /> Generate Key
                </Button>
              </div>

              {keysLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading...</div>
              ) : apiKeys.length === 0 ? (
                <Card className="glass-panel border-white/5 p-12 text-center">
                  <Key className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No API keys yet. Generate your first key to get started.</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {apiKeys.map((key: any) => (
                    <div key={key.id} data-testid={`card-api-key-${key.id}`} className="glass-panel border border-white/5 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Key className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-white text-sm">{key.name}</p>
                          <p className="text-xs font-mono text-muted-foreground">{key.keyPrefix}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={key.active ? "default" : "secondary"} className={key.active ? "bg-green-500/10 text-green-400 border-green-500/20" : ""}>
                          {key.active ? "Active" : "Revoked"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{key.permissions}</Badge>
                        <span className="text-xs text-muted-foreground">{key.lastUsed ? `Used ${new Date(key.lastUsed).toLocaleDateString()}` : "Never used"}</span>
                        {key.active && (
                          <Button variant="ghost" size="sm" onClick={() => revokeKeyMutation.mutate(key.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10" data-testid={`button-revoke-key-${key.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* New Key Dialog */}
              <Dialog open={showNewKey} onOpenChange={setShowNewKey}>
                <DialogContent className="bg-card border-white/10">
                  <DialogHeader><DialogTitle>Generate New API Key</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Key Name</label>
                      <Input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="e.g. Production Backend" data-testid="input-key-name" className="bg-white/5 border-white/10" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Permissions</label>
                      <Select value={newKeyPerms} onValueChange={setNewKeyPerms}>
                        <SelectTrigger className="bg-white/5 border-white/10" data-testid="select-key-permissions">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="read">Read Only</SelectItem>
                          <SelectItem value="write">Read + Write</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={() => setShowNewKey(false)}>Cancel</Button>
                    <Button onClick={() => createKeyMutation.mutate()} disabled={!newKeyName || createKeyMutation.isPending} data-testid="button-create-api-key">
                      {createKeyMutation.isPending ? "Generating..." : "Generate Key"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Revealed Key Dialog */}
              <Dialog open={!!revealedKey} onOpenChange={() => setRevealedKey(null)}>
                <DialogContent className="bg-card border-white/10 max-w-lg">
                  <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-400" /> Key Created — Save Now</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-300">
                      ⚠ This key will only be shown once. Copy it now and store it securely.
                    </div>
                    <div className="bg-black/40 rounded-lg p-4 font-mono text-sm text-green-300 break-all flex items-center justify-between gap-2" data-testid="text-revealed-api-key">
                      {revealedKey?.raw}
                      <CopyButton text={revealedKey?.raw || ""} />
                    </div>
                    <p className="text-xs text-muted-foreground">Use as: <code className="text-primary">Authorization: Bearer {revealedKey?.raw?.slice(0, 20)}...</code></p>
                  </div>
                  <Button onClick={() => setRevealedKey(null)} className="w-full" data-testid="button-confirm-key-saved">I've Saved My Key</Button>
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* === WEBHOOKS === */}
            <TabsContent value="webhooks">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Webhooks</h2>
                  <p className="text-sm text-muted-foreground">HMAC-SHA256 signed. Payloads verified via <code className="text-primary">X-InstantSettlement-Signature</code> header.</p>
                </div>
                <Button onClick={() => setShowNewWebhook(true)} className="gap-2" data-testid="button-new-webhook">
                  <Plus className="w-4 h-4" /> Add Endpoint
                </Button>
              </div>

              {hooksLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading...</div>
              ) : webhooks.length === 0 ? (
                <Card className="glass-panel border-white/5 p-12 text-center">
                  <Webhook className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">No webhooks configured yet.</p>
                  <p className="text-xs text-muted-foreground">Webhooks fire on settlement.completed, transaction.frozen, and more.</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {webhooks.map((wh: any) => (
                    <div key={wh.id} data-testid={`card-webhook-${wh.id}`} className="glass-panel border border-white/5 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <Webhook className="w-4 h-4 text-purple-400" />
                          </div>
                          <div>
                            <p className="font-medium text-white text-sm">{wh.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{wh.url}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs">{wh.events}</Badge>
                          <Badge variant={wh.active ? "default" : "secondary"} className={wh.active ? "bg-green-500/10 text-green-400 border-green-500/20" : ""}>
                            {wh.active ? "Active" : "Paused"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{wh.deliveryCount} deliveries</span>
                          <Button variant="ghost" size="sm" onClick={() => deleteWebhookMutation.mutate(wh.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10" data-testid={`button-delete-webhook-${wh.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6">
                <h3 className="text-sm font-semibold text-white mb-3">Sample Webhook Payload</h3>
                <CodeBlock code={sampleSettlementPayload} lang="json" />
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-semibold text-white mb-3">Signature Verification (Node.js)</h3>
                <CodeBlock code={verifySignature} lang="javascript" />
              </div>

              {/* New Webhook Dialog */}
              <Dialog open={showNewWebhook} onOpenChange={setShowNewWebhook}>
                <DialogContent className="bg-card border-white/10">
                  <DialogHeader><DialogTitle>Add Webhook Endpoint</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Name</label>
                      <Input value={newWebhookName} onChange={e => setNewWebhookName(e.target.value)} placeholder="e.g. Production Server" data-testid="input-webhook-name" className="bg-white/5 border-white/10" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">HTTPS URL</label>
                      <Input value={newWebhookUrl} onChange={e => setNewWebhookUrl(e.target.value)} placeholder="https://your-server.com/webhook" data-testid="input-webhook-url" className="bg-white/5 border-white/10" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Events</label>
                      <Select value={newWebhookEvents} onValueChange={setNewWebhookEvents}>
                        <SelectTrigger className="bg-white/5 border-white/10" data-testid="select-webhook-events">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="settlement.completed">settlement.completed</SelectItem>
                          <SelectItem value="transaction.frozen">transaction.frozen</SelectItem>
                          <SelectItem value="kyc.approved">kyc.approved</SelectItem>
                          <SelectItem value="*">All Events (*)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={() => setShowNewWebhook(false)}>Cancel</Button>
                    <Button onClick={() => createWebhookMutation.mutate()} disabled={!newWebhookName || !newWebhookUrl || createWebhookMutation.isPending} data-testid="button-create-webhook">
                      {createWebhookMutation.isPending ? "Creating..." : "Create Webhook"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={!!revealedSecret} onOpenChange={() => setRevealedSecret(null)}>
                <DialogContent className="bg-card border-white/10 max-w-lg">
                  <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-400" /> Webhook Created — Save Signing Secret</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-300">
                      ⚠ This signing secret will only be shown once. Store it in your environment variables.
                    </div>
                    <div className="bg-black/40 rounded-lg p-4 font-mono text-sm text-purple-300 break-all flex items-center justify-between gap-2" data-testid="text-revealed-webhook-secret">
                      {revealedSecret?.secret}
                      <CopyButton text={revealedSecret?.secret || ""} />
                    </div>
                    <p className="text-xs text-muted-foreground">Set as: <code className="text-primary">WEBHOOK_SECRET={revealedSecret?.secret?.slice(0, 8)}...</code></p>
                  </div>
                  <Button onClick={() => setRevealedSecret(null)} className="w-full">I've Saved My Secret</Button>
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* === API REFERENCE === */}
            <TabsContent value="reference">
              <div className="space-y-6">
                <div className="glass-panel border border-white/5 rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-1">Base URL</h2>
                  <div className="font-mono text-primary text-sm bg-black/30 rounded-lg px-4 py-3 flex items-center justify-between">
                    https://instantsettlement.ai/api/v1
                    <CopyButton text="https://instantsettlement.ai/api/v1" />
                  </div>
                </div>

                <div className="glass-panel border border-white/5 rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-2">Authentication</h2>
                  <p className="text-sm text-muted-foreground mb-4">Include your API key in the Authorization header:</p>
                  <CodeBlock code={`Authorization: Bearer isk_live_YOUR_API_KEY`} lang="http" />
                </div>

                <div className="glass-panel border border-white/5 rounded-xl p-6 space-y-6">
                  <h2 className="text-lg font-semibold text-white">Endpoints</h2>

                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">GET</Badge>
                      <code className="text-sm text-white font-mono">/api/v1/transactions</code>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">List recent transactions with AI risk scores. Returns up to 50 records.</p>
                    <CodeBlock code={curlExample} lang="bash" />
                  </div>

                  <div className="border-t border-white/5 pt-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">POST</Badge>
                      <code className="text-sm text-white font-mono">/api/v1/transactions</code>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">Submit a new settlement transaction. Runs AI risk assessment, auto-freezes if High risk ≥$1M.</p>
                    <CodeBlock code={curlPost} lang="bash" />
                  </div>

                  <div className="border-t border-white/5 pt-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">GET</Badge>
                      <code className="text-sm text-white font-mono">/api/v1/rates</code>
                    </div>
                    <p className="text-sm text-muted-foreground">Get real-time exchange rates (USD, EUR, GBP, JPY, CHF) with ECB placeholder data.</p>
                  </div>
                </div>

                <div className="glass-panel border border-white/5 rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-3">Rate Limits</h2>
                  <div className="space-y-2">
                    {[
                      { endpoint: "All API routes", limit: "100 req / 15 min" },
                      { endpoint: "/api/auth/* (2FA)", limit: "10 req / 15 min" },
                      { endpoint: "POST /api/v1/transactions", limit: "30 req / min" },
                    ].map(({ endpoint, limit }) => (
                      <div key={endpoint} className="flex justify-between text-sm py-2 border-b border-white/5 last:border-0">
                        <code className="text-muted-foreground font-mono">{endpoint}</code>
                        <Badge variant="outline" className="text-xs font-mono">{limit}</Badge>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">Rate limit headers: <code className="text-primary">RateLimit-Limit</code>, <code className="text-primary">RateLimit-Remaining</code>, <code className="text-primary">RateLimit-Reset</code></p>
                </div>
              </div>
            </TabsContent>

            {/* === FX RATES === */}
            <TabsContent value="fx">
              <div className="glass-panel border border-white/5 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Exchange Rates</h2>
                    <p className="text-sm text-muted-foreground">Multi-currency support: USD · EUR · GBP · JPY · CHF</p>
                  </div>
                  <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/20">ECB Placeholder — Production: OpenFX/ECB API</Badge>
                </div>

                {fxRates?.rates ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">From</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">To</th>
                          <th className="text-right py-2 px-3 text-muted-foreground font-medium">Rate</th>
                          <th className="text-right py-2 px-3 text-muted-foreground font-medium">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fxRates.rates.map((r: any) => (
                          <tr key={r.id} className="border-b border-white/5 hover:bg-white/2" data-testid={`row-fx-${r.fromCurrency}-${r.toCurrency}`}>
                            <td className="py-2 px-3 font-mono font-bold text-white">{r.fromCurrency}</td>
                            <td className="py-2 px-3 font-mono text-muted-foreground">{r.toCurrency}</td>
                            <td className="py-2 px-3 text-right font-mono text-primary">{Number(r.rate).toFixed(4)}</td>
                            <td className="py-2 px-3 text-right"><Badge variant="outline" className="text-xs text-amber-400 border-amber-500/20 bg-amber-500/5">{r.source}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <div className="text-center py-8 text-muted-foreground">Loading exchange rates...</div>}

                <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg text-xs text-blue-300">
                  💡 Endpoint: <code className="font-mono">GET /api/fx/convert?amount=1000&from=USD&to=EUR</code> for real-time currency conversion
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </div>
  );
}
