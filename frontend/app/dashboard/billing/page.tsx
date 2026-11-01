'use client';

import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import {
  CreditCard,
  Plus,
  ArrowUpRight,
  Check,
  Zap,
  Sparkles,
  AlertCircle,
  Calculator,
  TrendingDown,
  ShieldCheck,
} from 'lucide-react';

export default function BillingPage() {
  const [balanceData, setBalanceData] = useState<any>(null);
  const [pricing, setPricing] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState(25);
  const [processing, setProcessing] = useState(false);
  const [topupSuccess, setTopupSuccess] = useState('');

  // Cost calculator states
  const [calcModel, setCalcModel] = useState('llama-3.3-70b');
  const [calcRequests, setCalcRequests] = useState(5000);
  const [calcPromptTokens, setCalcPromptTokens] = useState(1200);
  const [calcOutputTokens, setCalcOutputTokens] = useState(350);

  const loadBilling = async () => {
    try {
      const [bal, price, txs] = await Promise.all([
        apiRequest('/api/billing/balance').catch(() => null),
        apiRequest('/api/billing/pricing').catch(() => []),
        apiRequest('/api/billing/transactions?limit=10').catch(() => []),
      ]);
      setBalanceData(bal);
      setPricing(price || []);
      setTransactions(txs || []);
    } catch (err) {
      console.error('Failed to load billing:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBilling();
  }, []);

  const handleTopup = async (amount: number) => {
    setProcessing(true);
    setTopupSuccess('');

    try {
      const res = await apiRequest('/api/billing/topup', {
        method: 'POST',
        body: JSON.stringify({ amountUsd: amount }),
      });
      setTopupSuccess(res.message);
      await loadBilling();
      setTimeout(() => {
        setShowTopupModal(false);
        setTopupSuccess('');
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Top-up failed.');
    } finally {
      setProcessing(false);
    }
  };

  const selectedPriceObj = pricing.find((p) => p.modelIdentifier === calcModel) || {
    inputCostPerMillion: 0.2,
    outputCostPerMillion: 0.4,
  };

  const monthlyRequests = calcRequests * 30;
  const monthlyPromptTokens = monthlyRequests * calcPromptTokens;
  const monthlyOutputTokens = monthlyRequests * calcOutputTokens;
  const monthlyTotalTokens = monthlyPromptTokens + monthlyOutputTokens;

  const billableRatio =
    monthlyTotalTokens > 5_000_000 ? (monthlyTotalTokens - 5_000_000) / monthlyTotalTokens : 0;
  const billablePrompt = monthlyPromptTokens * billableRatio;
  const billableOutput = monthlyOutputTokens * billableRatio;

  const estimatedYoyoCost =
    (billablePrompt / 1_000_000) * Number(selectedPriceObj.inputCostPerMillion) +
    (billableOutput / 1_000_000) * Number(selectedPriceObj.outputCostPerMillion);

  const estimatedProprietaryCost =
    (monthlyPromptTokens / 1_000_000) * 2.5 + (monthlyOutputTokens / 1_000_000) * 10.0;

  const savingsAmount = Math.max(0, estimatedProprietaryCost - estimatedYoyoCost);
  const savingsPercent =
    estimatedProprietaryCost > 0
      ? Math.round((savingsAmount / estimatedProprietaryCost) * 100)
      : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing & Token Pricing</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Transparent pay-as-you-go compute credits with zero markup on open-weights model inference.
          </p>
        </div>
        <button
          onClick={() => setShowTopupModal(true)}
          className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 text-xs flex items-center space-x-1.5 shadow-md shadow-primary/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Compute Credits</span>
        </button>
      </div>

      {/* Credit Balance Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 rounded-2xl bg-card border border-border col-span-1 md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Current Prepaid Balance</span>
              <CreditCard className="w-4 h-4 text-primary" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-extrabold font-mono text-foreground">
                ${(balanceData?.balanceUsd || 10.0).toFixed(2)}
              </span>
              <span className="text-xs font-mono text-muted-foreground">USD</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Credits automatically deduct as tokens are consumed across `/v1/chat/completions`. Free monthly quota is consumed before your credit balance is drawn.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-border flex items-center space-x-3">
            {[10, 25, 50, 100].map((amt) => (
              <button
                key={amt}
                onClick={() => handleTopup(amt)}
                className="px-3 py-1.5 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground text-xs font-mono font-semibold transition-all"
              >
                +${amt}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cost Economics
            </span>
            <div className="mt-3 space-y-3 text-xs text-muted-foreground">
              <div className="flex items-center space-x-2 text-foreground font-medium">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Zero Subscription Fees</span>
              </div>
              <div className="flex items-center space-x-2 text-foreground font-medium">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>5M Free Tokens Every Month</span>
              </div>
              <div className="flex items-center space-x-2 text-foreground font-medium">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Unused Credits Never Expire</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Token Cost & Savings Calculator */}
      <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">Interactive Cost & Savings Calculator</h3>
              <p className="text-xs text-muted-foreground">
                Estimate your monthly compute bill based on daily request volumes and compare against proprietary APIs.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 self-start md:self-auto">
            Zero Platform Markup
          </span>
        </div>

        {/* Calculator inputs grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Model picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Select Foundation Model</label>
            <select
              value={calcModel}
              onChange={(e) => setCalcModel(e.target.value)}
              className="w-full bg-muted/40 text-foreground border border-border rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:border-primary cursor-pointer"
            >
              {pricing.length > 0 ? (
                pricing.map((p) => (
                  <option key={p.modelIdentifier} value={p.modelIdentifier}>
                    {p.name} (${p.inputCostPerMillion}/in, ${p.outputCostPerMillion}/out)
                  </option>
                ))
              ) : (
                <option value="llama-3.3-70b">Llama 3.3 70B ($0.20/in, $0.40/out)</option>
              )}
            </select>
          </div>

          {/* Daily requests */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-muted-foreground">Daily Request Volume</label>
              <span className="font-mono text-foreground font-bold">{calcRequests.toLocaleString()} / day</span>
            </div>
            <input
              type="range"
              min="500"
              max="100000"
              step="500"
              value={calcRequests}
              onChange={(e) => setCalcRequests(parseInt(e.target.value, 10))}
              className="w-full accent-primary cursor-pointer"
            />
          </div>

          {/* Prompt / Completion token sliders */}
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-muted-foreground">Avg Prompt Tokens</label>
                <span className="font-mono text-cyan-400 font-bold">{calcPromptTokens} tok</span>
              </div>
              <input
                type="range"
                min="100"
                max="8000"
                step="100"
                value={calcPromptTokens}
                onChange={(e) => setCalcPromptTokens(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-muted-foreground">Avg Output Tokens</label>
                <span className="font-mono text-purple-400 font-bold">{calcOutputTokens} tok</span>
              </div>
              <input
                type="range"
                min="50"
                max="4000"
                step="50"
                value={calcOutputTokens}
                onChange={(e) => setCalcOutputTokens(parseInt(e.target.value, 10))}
                className="w-full accent-purple-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Calculations Results Bar */}
        <div className="p-5 rounded-2xl bg-muted/30 border border-border grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Monthly Traffic</span>
            <span className="text-base font-extrabold text-foreground">
              {(calcRequests * 30).toLocaleString()} requests
            </span>
            <span className="text-[10px] text-muted-foreground block">
              {(monthlyTotalTokens / 1_000_000).toFixed(1)}M total tokens
            </span>
          </div>

          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Free Tier Deduction</span>
            <span className="text-base font-extrabold text-emerald-400">-5,000,000 tokens</span>
            <span className="text-[10px] text-muted-foreground block">Included free every month</span>
          </div>

          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Estimated YOYO Bill</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">
              ${estimatedYoyoCost.toFixed(2)}
            </span>
            <span className="text-[10px] text-muted-foreground block">per month</span>
          </div>

          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Proprietary API Equivalent</span>
            <span className="text-2xl font-black text-zinc-500 line-through font-mono">
              ${estimatedProprietaryCost.toFixed(2)}
            </span>
            <span className="text-[10px] text-emerald-400 block font-semibold">
              Save ${savingsAmount.toFixed(2)} ({savingsPercent}%)
            </span>
          </div>
        </div>
      </div>

      {/* Model Pricing Table */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Transparent Model Pricing Matrix</span>
          </div>
          <span className="text-xs text-muted-foreground">Per 1,000,000 Tokens</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
              <tr>
                <th className="px-6 py-3">Model</th>
                <th className="px-6 py-3">API Identifier</th>
                <th className="px-6 py-3">Input Cost / 1M Tokens</th>
                <th className="px-6 py-3">Output Cost / 1M Tokens</th>
                <th className="px-6 py-3 text-right">Free Tier Eligible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono text-xs">
              {pricing.map((p) => (
                <tr key={p.modelIdentifier} className="hover:bg-muted/20">
                  <td className="px-6 py-4 font-sans font-semibold text-foreground">{p.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{p.modelIdentifier}</td>
                  <td className="px-6 py-4 text-foreground font-semibold">
                    ${p.inputCostPerMillion.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-foreground font-semibold">
                    ${p.outputCostPerMillion.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Check className="w-3 h-3" />
                      <span>Free 5M/mo</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transactions History */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <span className="font-semibold text-sm">Recent Transactions</span>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No billing transactions recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                <tr>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/20">
                    <td className="px-6 py-3.5 font-mono font-bold text-emerald-400">
                      {tx.type}
                    </td>
                    <td className="px-6 py-3.5 text-muted-foreground">{tx.description}</td>
                    <td className="px-6 py-3.5 font-mono font-semibold text-foreground">
                      +${tx.amountUsd.toFixed(2)}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Topup Modal */}
      {showTopupModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base">Purchase Compute Credits</h3>
              <button
                onClick={() => setShowTopupModal(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>

            {topupSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
                <Check className="w-4 h-4" />
                <span>{topupSuccess}</span>
              </div>
            )}

            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Select an amount to replenish your account balance:
              </p>

              <div className="grid grid-cols-3 gap-3 font-mono">
                {[10, 25, 50, 100, 250, 500].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setTopupAmount(amt)}
                    className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                      topupAmount === amt
                        ? 'border-primary bg-primary/10 text-primary shadow-sm shadow-primary/20'
                        : 'border-border bg-muted/40 hover:bg-muted text-foreground'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>

              <button
                disabled={processing}
                onClick={() => handleTopup(topupAmount)}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all text-sm shadow-md shadow-primary/20 disabled:opacity-50"
              >
                {processing ? 'Processing...' : `Pay $${topupAmount}.00 USD`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

