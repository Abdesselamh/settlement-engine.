import { Resend } from 'resend';

// Resend connector — fetches API key from Replit connection API
async function getResendClient(): Promise<{ client: Resend; fromEmail: string } | null> {
  try {
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY
      ? 'repl ' + process.env.REPL_IDENTITY
      : process.env.WEB_REPL_RENEWAL
        ? 'depl ' + process.env.WEB_REPL_RENEWAL
        : null;

    if (!xReplitToken || !hostname) throw new Error('No Replit token');

    const connectionSettings = await fetch(
      `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=resend`,
      { headers: { 'Accept': 'application/json', 'X-Replit-Token': xReplitToken } }
    ).then(r => r.json()).then(d => d.items?.[0]);

    if (!connectionSettings?.settings?.api_key) throw new Error('Resend not connected');

    const client = new Resend(connectionSettings.settings.api_key);
    const fromEmail = connectionSettings.settings.from_email || 'noreply@instantsettlement.ai';
    return { client, fromEmail };
  } catch (e: any) {
    console.warn('[email] Resend not available:', e.message);
    return null;
  }
}

export async function sendTwoFactorEmail(email: string, code: string, name: string): Promise<void> {
  console.log(`[2FA EMAIL] To: ${email}, Code: ${code}`);
  const resend = await getResendClient();
  if (!resend) return;
  try {
    await resend.client.emails.send({
      from: resend.fromEmail,
      to: email,
      subject: 'InstantSettlement.ai — Your Login Code',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#050816;color:#fff;padding:40px;border-radius:12px;border:1px solid rgba(0,229,255,0.2)">
          <h2 style="color:#00e5ff;margin-bottom:8px">Secure Login</h2>
          <p style="color:#94a3b8">Hi ${name},</p>
          <p style="color:#94a3b8">Your one-time verification code is:</p>
          <div style="background:rgba(0,229,255,0.1);border:1px solid rgba(0,229,255,0.3);border-radius:8px;padding:24px;text-align:center;margin:24px 0">
            <span style="font-size:36px;font-weight:bold;letter-spacing:12px;color:#00e5ff;font-family:monospace">${code}</span>
          </div>
          <p style="color:#94a3b8;font-size:13px">This code expires in 10 minutes. Do not share it with anyone.</p>
          <hr style="border-color:rgba(255,255,255,0.1);margin:24px 0"/>
          <p style="color:#475569;font-size:11px">InstantSettlement.ai &bull; ISO 27001 Certified &bull; AES-256 Encrypted</p>
        </div>
      `
    });
    console.log(`[2FA EMAIL] Sent via Resend to ${email}`);
  } catch (e: any) {
    console.error('[2FA EMAIL] Send failed:', e.message);
  }
}

export async function sendSettlementAlertEmail(email: string, data: {
  txId: string;
  amount: string;
  currency: string;
  status: string;
  sender: string;
  receiver: string;
  riskScore?: string;
}): Promise<void> {
  console.log(`[SETTLEMENT ALERT] To: ${email}, TX: ${data.txId}, Status: ${data.status}`);
  const resend = await getResendClient();
  if (!resend) return;
  const isHighRisk = data.riskScore === 'High';
  try {
    await resend.client.emails.send({
      from: resend.fromEmail,
      to: email,
      subject: `Settlement ${data.status} — ${data.txId}${isHighRisk ? ' ⚠️ HIGH RISK' : ''}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#050816;color:#fff;padding:40px;border-radius:12px;border:1px solid rgba(0,229,255,0.2)">
          <h2 style="color:#00e5ff">Settlement ${data.status}</h2>
          ${isHighRisk ? `<div style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);border-radius:8px;padding:12px;margin-bottom:20px;color:#fca5a5;font-weight:bold">⚠️ HIGH RISK TRANSACTION — Immediate review required</div>` : ''}
          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <tr><td style="color:#94a3b8;padding:8px 0">Transaction ID</td><td style="color:#fff;font-family:monospace">${data.txId}</td></tr>
            <tr><td style="color:#94a3b8;padding:8px 0">Amount</td><td style="color:#fff;font-weight:bold">${Number(data.amount).toLocaleString()} ${data.currency}</td></tr>
            <tr><td style="color:#94a3b8;padding:8px 0">Sender</td><td style="color:#fff">${data.sender}</td></tr>
            <tr><td style="color:#94a3b8;padding:8px 0">Receiver</td><td style="color:#fff">${data.receiver}</td></tr>
            ${data.riskScore ? `<tr><td style="color:#94a3b8;padding:8px 0">Risk Score</td><td style="color:${isHighRisk ? '#f87171' : data.riskScore === 'Medium' ? '#fbbf24' : '#34d399'};font-weight:bold">${data.riskScore}</td></tr>` : ''}
          </table>
          <hr style="border-color:rgba(255,255,255,0.1);margin:24px 0"/>
          <p style="color:#475569;font-size:11px">InstantSettlement.ai &bull; Automated Settlement Alert</p>
        </div>
      `
    });
  } catch (e: any) {
    console.error('[SETTLEMENT ALERT] Send failed:', e.message);
  }
}

export async function sendInvoiceEmail(email: string, invoiceData: {
  name: string;
  tier: string;
  amount: number;
  currency: string;
  invoiceId: string;
  date: string;
}): Promise<void> {
  console.log(`[INVOICE EMAIL] To: ${email}, Invoice: ${invoiceData.invoiceId}`);
  const resend = await getResendClient();
  if (!resend) return;
  try {
    await resend.client.emails.send({
      from: resend.fromEmail,
      to: email,
      subject: `Your InstantSettlement.ai Invoice — ${invoiceData.invoiceId}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#050816;color:#fff;padding:40px;border-radius:12px;border:1px solid rgba(0,229,255,0.2)">
          <h2 style="color:#00e5ff">Payment Confirmed</h2>
          <p style="color:#94a3b8">Hi ${invoiceData.name},<br/>Your subscription is now active.</p>
          <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:20px;margin:20px 0">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:#94a3b8">Plan</span><span style="color:#fff;text-transform:capitalize">${invoiceData.tier}</span></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:#94a3b8">Amount</span><span style="color:#fff;font-weight:bold">$${invoiceData.amount.toLocaleString()}</span></div>
            <div style="display:flex;justify-content:space-between"><span style="color:#94a3b8">Invoice</span><span style="color:#00e5ff;font-family:monospace">${invoiceData.invoiceId}</span></div>
          </div>
          <hr style="border-color:rgba(255,255,255,0.1);margin:24px 0"/>
          <p style="color:#475569;font-size:11px">InstantSettlement.ai &bull; ISO 27001 Certified</p>
        </div>
      `
    });
  } catch (e: any) {
    console.error('[INVOICE EMAIL] Send failed:', e.message);
  }
}

export async function sendHighRiskAlertToAdmin(adminEmail: string, data: {
  txId: string;
  amount: string;
  currency: string;
  sender: string;
  receiver: string;
  riskScore: string;
  riskFactors: string[];
}): Promise<void> {
  console.log(`[HIGH RISK ALERT] Admin: ${adminEmail}, TX: ${data.txId}`);
  const resend = await getResendClient();
  if (!resend) return;
  try {
    await resend.client.emails.send({
      from: resend.fromEmail,
      to: adminEmail,
      subject: `🚨 HIGH RISK TRANSACTION DETECTED — ${data.txId}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#050816;color:#fff;padding:40px;border-radius:12px;border:2px solid rgba(239,68,68,0.5)">
          <h2 style="color:#f87171">🚨 High Risk Alert</h2>
          <p style="color:#94a3b8">Immediate attention required for the following transaction:</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <tr><td style="color:#94a3b8;padding:8px 0">TX ID</td><td style="color:#fff;font-family:monospace">${data.txId}</td></tr>
            <tr><td style="color:#94a3b8;padding:8px 0">Amount</td><td style="color:#fff;font-weight:bold">${Number(data.amount).toLocaleString()} ${data.currency}</td></tr>
            <tr><td style="color:#94a3b8;padding:8px 0">Sender → Receiver</td><td style="color:#fff">${data.sender} → ${data.receiver}</td></tr>
            <tr><td style="color:#94a3b8;padding:8px 0">Risk Score</td><td style="color:#f87171;font-weight:bold">${data.riskScore}</td></tr>
          </table>
          <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:16px;margin-top:16px">
            <p style="color:#fca5a5;font-weight:bold;margin:0 0 8px">Risk Factors:</p>
            <ul style="color:#94a3b8;margin:0;padding-left:20px">${data.riskFactors.map(f => `<li>${f}</li>`).join('')}</ul>
          </div>
          <hr style="border-color:rgba(255,255,255,0.1);margin:24px 0"/>
          <p style="color:#475569;font-size:11px">InstantSettlement.ai &bull; Automated Risk Alert System</p>
        </div>
      `
    });
  } catch (e: any) {
    console.error('[HIGH RISK ALERT] Send failed:', e.message);
  }
}
