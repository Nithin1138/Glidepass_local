"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Check, Shield, Zap, Sparkles, CreditCard, ChevronRight, HelpCircle, 
  ArrowLeft, Globe, Key, Clock, BookOpen, Star, Copy, ExternalLink, Gift, Tag, Award, Users, Share2
} from "lucide-react";
import Link from "next/link";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PALETTE TOKENS (Synced with Admin page theme)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const P = {
  white: "#FAFAFA",
  sky: "#C7EEFF",
  blue: "#0077C0",
  black: "#050505",
  gray: "#121212",
  border: "rgba(199, 238, 255, 0.08)",
  textMuted: "#A0AEC0"
} as const;

export default function PricingPage() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  
  // Dynamic settings state
  const [dbPlans, setDbPlans] = useState<any[]>([]);
  const [monetizationEnabled, setMonetizationEnabled] = useState(true);
  const [freeEnabled, setFreeEnabled] = useState(false);
  const [rewardDays, setRewardDays] = useState(7);

  // Checkout states
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidatingReferral, setIsValidatingReferral] = useState(false);
  const [isReferralValid, setIsReferralValid] = useState(false);
  const [referralCodeError, setReferralCodeError] = useState<string | null>(null);
  
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isRazorpayLoaded, setIsRazorpayLoaded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // User Referral Dashboard states
  const [userEmail, setUserEmail] = useState("");
  const [isGeneratingReferral, setIsGeneratingReferral] = useState(false);
  const [userReferralCode, setUserReferralCode] = useState<string | null>(null);
  const [userReferrals, setUserReferrals] = useState<any[]>([]);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  const defaultPlans = [
    {
      name: "Week Pass",
      appTier: "Basic",
      price: "₹39",
      period: "per week",
      description: "Perfect for quick test-prep and exam weeks.",
      features: [
        "Type Mode (Bypass paste blocks)",
        "Custom WPM control",
        "AP Isolation bypass (Tunnel)",
        "Instant Clipboard sync",
        "1 Active session at a time",
      ],
      isPopular: false,
      badge: "Exam Special",
      color: "rgba(160, 174, 192, 0.08)"
    },
    {
      name: "Monthly Pass",
      appTier: "Pro",
      price: "₹99",
      period: "per month",
      description: "For consistent, hassle-free campus connectivity.",
      features: [
        "All Week Pass features",
        "Live Sync character mirroring",
        "Persistent session pairing",
        "Multiple device configurations",
        "Priority tunnel routing",
      ],
      isPopular: false,
      badge: "Standard",
      color: "rgba(0, 119, 192, 0.08)"
    },
    {
      name: "Sem Pass",
      appTier: "Max",
      price: "₹299",
      period: "per semester",
      description: "The ultimate academic semester companion. Unmatched value.",
      features: [
        "All Monthly Pass features",
        "Unlimited parallel sessions",
        "Dedicated high-speed Tunnels",
        "Direct developer support",
        "Ad-free experience",
      ],
      isPopular: true,
      badge: "Best Value",
      color: "rgba(199, 238, 255, 0.12)"
    },
    {
      name: "Yearly Pass",
      appTier: "Ultra",
      price: "₹499",
      period: "per year",
      description: "Full year-round connectivity and unlimited access.",
      features: [
        "All Sem Pass features",
        "Offline emergency access",
        "Free version upgrades",
        "Persistent cloud backup",
        "Special Discord contributor role",
      ],
      isPopular: false,
      badge: "Power User",
      color: "rgba(250, 250, 250, 0.08)"
    }
  ];

  const faqs = [
    {
      q: "How does the license activation work?",
      a: "Once you purchase a pass, you will receive an activation key immediately on screen and via your registered email. Simply paste it into the Lock Screen of the LANpad desktop app to unlock all features instantly."
    },
    {
      q: "Can I use one license key on multiple devices?",
      a: "Yes! Monthly, Sem, and Yearly passes allow you to activate LANpad on up to the configured limit of personal devices simultaneously (managed under your email)."
    },
    {
      q: "What is the AP Isolation Bypass (Tunnel)?",
      a: "Institutional Wi-Fi networks (like college campus Wi-Fi) block devices from communicating with each other. The Tunnel connection acts as a secure external bridge to bypass these restrictions seamlessly."
    },
    {
      q: "Do you offer refunds?",
      a: "Due to the digital nature of the software passes, we do not support automated refunds. However, if you face issues, reach out to our team via the Admin portal or email and we will resolve it."
    }
  ];

  // Fetch DB configurations & load Razorpay script
  useEffect(() => {
    fetch("/api/monetization/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.plans) {
          setDbPlans(data.plans);
        }
        if (data.monetization_enabled !== undefined) {
          setMonetizationEnabled(data.monetization_enabled);
        }
        if (data.free_enabled !== undefined) {
          setFreeEnabled(data.free_enabled);
        }
        if (data.referral_reward_days !== undefined) {
          setRewardDays(data.referral_reward_days);
        }
      })
      .catch((err) => console.error("Error fetching plans status:", err));

    // Read URL referral parameter
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref") || params.get("referral");
    if (ref) {
      const cleanRef = ref.toUpperCase();
      setReferralCode(cleanRef);
      fetch(`/api/referral?code=${encodeURIComponent(cleanRef)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.valid) {
            setIsReferralValid(true);
          }
        })
        .catch((err) => console.error("Error auto-validating referral:", err));
    }

    // Load Razorpay script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setIsRazorpayLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Map and merge plans
  const activePlans = defaultPlans.map((uiPlan) => {
    const dbPlan = dbPlans.find((p) => p.tier?.toLowerCase() === uiPlan.appTier.toLowerCase());
    return {
      ...uiPlan,
      name: dbPlan?.title || uiPlan.name,
      price: dbPlan?.price || uiPlan.price,
      period: dbPlan?.validity_days ? `for ${dbPlan.validity_days} days` : uiPlan.period,
      validityDays: dbPlan?.validity_days || 30,
      description: dbPlan?.subtitle || uiPlan.description,
    };
  });

  // Handle coupon validation
  const validateCoupon = async () => {
    if (!couponCode) return;
    setIsValidatingCoupon(true);
    setCouponDiscount(null);
    setCouponError(null);

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode }),
      });
      const data = await res.json();
      if (data.valid) {
        setCouponDiscount(data.discount);
      } else {
        setCouponError(data.error || "Invalid coupon code");
      }
    } catch (e) {
      setCouponError("Failed to validate coupon");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  // Handle referral validation
  const validateReferralCode = async () => {
    if (!referralCode) return;
    setIsValidatingReferral(true);
    setIsReferralValid(false);
    setReferralCodeError(null);

    try {
      const res = await fetch(`/api/referral?code=${encodeURIComponent(referralCode)}`);
      const data = await res.json();
      if (data.valid) {
        if (data.email?.toLowerCase() === checkoutEmail.toLowerCase()) {
          setReferralCodeError("Cannot refer yourself!");
        } else {
          setIsReferralValid(true);
        }
      } else {
        setReferralCodeError("Invalid referral code");
      }
    } catch (e) {
      setReferralCodeError("Failed to validate referral code");
    } finally {
      setIsValidatingReferral(false);
    }
  };

  // Calculate pricing breakdown (only applying the highest discount of either Coupon or Referral)
  const getCalculatedPrice = () => {
    if (!selectedPlan) return { base: 0, discount: 0, refDiscount: 0, total: 0, applied: "none" };
    const base = parseFloat(selectedPlan.price.replace(/[^0-9]/g, "")) || 0;
    
    let couponPct = 0;
    if (couponDiscount) {
      couponPct = parseFloat(couponDiscount.replace(/[^0-9]/g, "")) || 0;
    }
    
    let refPct = isReferralValid ? 10 : 0;
    
    let discount = 0;
    let refDiscount = 0;
    let applied: "none" | "coupon" | "referral" = "none";
    
    if (couponPct >= refPct && couponPct > 0) {
      discount = base * (couponPct / 100);
      applied = "coupon";
    } else if (refPct > couponPct) {
      refDiscount = base * (refPct / 100);
      applied = "referral";
    }
    
    const total = Math.max(base - discount - refDiscount, 1);
    return { base, discount, refDiscount, total, applied };
  };

  // Launch Razorpay Payment checkout
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutEmail) {
      setPaymentError("Recipient Email address is required");
      return;
    }
    if (!isRazorpayLoaded) {
      setPaymentError("Payment SDK is loading, please try again in a moment");
      return;
    }

    setIsProcessingPayment(true);
    setPaymentError(null);

    try {
      // 1. Create order on server
      const res = await fetch("/api/checkout/razorpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: checkoutEmail,
          tier: selectedPlan.appTier,
          couponCode: couponDiscount ? couponCode : "",
          referralCode: isReferralValid ? referralCode : "",
        }),
      });
      const orderData = await res.json();
      if (!orderData.success) {
        throw new Error(orderData.error || "Failed to initiate payment");
      }

      // 2. Open Razorpay Widget
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "LANpad Premium",
        description: `${selectedPlan.name} - ${selectedPlan.appTier} Tier`,
        order_id: orderData.orderId,
        prefill: {
          email: checkoutEmail,
        },
        theme: {
          color: P.blue,
        },
        config: {
          display: {
            blocks: {
              upi: {
                name: "UPI / QR Code Scanner",
                instruments: [
                  {
                    method: "upi",
                    flows: ["qr", "intent", "collect"],
                  },
                ],
              },
            },
            sequence: ["block.upi"],
            preferences: {
              show_default_blocks: false,
            },
          },
        },
        handler: async function (response: any) {
          try {
            // 3. Verify Payment
            const verifyRes = await fetch("/api/checkout/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                email: checkoutEmail,
                tier: selectedPlan.appTier,
                couponCode,
                referralCode,
                amount: orderData.amount,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              setLicenseKey(verifyData.licenseKey);
            } else {
              setPaymentError(verifyData.error || "Verification failed");
            }
          } catch (err: any) {
            setPaymentError(err.message || "Error verifying payment signature");
          } finally {
            setIsProcessingPayment(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessingPayment(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setPaymentError(err.message || "Failed to start Razorpay payment checkout");
      setIsProcessingPayment(false);
    }
  };

  // Generate / Fetch Referral Code
  const fetchReferralDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail) return;
    setIsGeneratingReferral(true);
    setReferralError(null);

    try {
      const res = await fetch(`/api/referral?email=${encodeURIComponent(userEmail)}`);
      const data = await res.json();
      
      if (data.referralCode) {
        setUserReferralCode(data.referralCode);
        setUserReferrals(data.referrals || []);
      } else {
        // Generate new referral code automatically based on email username
        const prefix = userEmail.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8);
        const randomNum = Math.floor(100 + Math.random() * 900);
        const autoCode = `${prefix}${randomNum}`;

        const createRes = await fetch("/api/referral", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userEmail, code: autoCode }),
        });
        const createData = await createRes.json();
        if (createData.success) {
          setUserReferralCode(createData.referralCode);
          setUserReferrals([]);
        } else {
          setReferralError(createData.error || "Failed to generate referral code");
        }
      }
    } catch (err) {
      setReferralError("Could not retrieve referral program details.");
    } finally {
      setIsGeneratingReferral(false);
    }
  };

  const copyToClipboard = (text: string, flagSetter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    flagSetter(true);
    setTimeout(() => flagSetter(false), 2000);
  };

  const pricingDetails = getCalculatedPrice();

  return (
    <div className="min-h-screen text-[#FAFAFA] font-sans relative overflow-hidden" style={{ backgroundColor: P.black }}>
      
      {/* ── Background Grid & Orbs ── */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(199,238,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(199,238,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      
      {/* Glowing Accent Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#0077C0]/10 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#C7EEFF]/5 to-transparent blur-[120px] pointer-events-none" />

      {/* ── Header ── */}
      <header className="border-b border-[rgba(199,238,255,0.08)] bg-black/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <ArrowLeft className="text-[#C7EEFF]" size={20} />
              <span className="text-xs uppercase tracking-widest text-[#A0AEC0]">Home</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <a href="#referrals" className="text-xs uppercase tracking-wider text-[#C7EEFF] hover:underline flex items-center gap-1.5 font-bold">
              <Gift size={14} /> Referral Rewards
            </a>
            <span className="text-xs px-2.5 py-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 font-mono">
              {monetizationEnabled ? "PRO ACTIVE" : "CAMPUS FREE"}
            </span>
          </div>
        </div>
      </header>

      {/* ── Hero section ── */}
      <main className="max-w-7xl mx-auto px-6 py-20 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[rgba(199,238,255,0.15)] bg-[#121212]/80 mb-6"
          >
            <Sparkles size={14} className="text-[#C7EEFF]" />
            <span className="text-xs font-semibold tracking-wider uppercase text-[#C7EEFF]">PLANS & ACCESS KEYS</span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6"
          >
            Choose your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C7EEFF] via-[#0077C0] to-[#FAFAFA]">GlidePass</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-lg text-[#A0AEC0] font-medium"
          >
            {monetizationEnabled 
              ? "Neutralize institutional restrictions and bypass AP Isolation instantly. Choose the plan that fits your campus needs."
              : "GlidePass is currently FREE for all campus users. Download and activate GlidePass using default credentials!"}
          </motion.p>
        </div>

        {/* ── Pricing Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-24">
          {activePlans.map((plan, index) => {
            const isHovered = hoveredCard === index;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.8 }}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
                className={`relative rounded-2xl border transition-all duration-500 overflow-hidden flex flex-col justify-between`}
                style={{
                  backgroundColor: plan.isPopular ? "rgba(18, 18, 18, 0.85)" : "rgba(5, 5, 5, 0.70)",
                  borderColor: plan.isPopular 
                    ? "rgba(0, 119, 192, 0.4)" 
                    : (isHovered ? "rgba(199, 238, 255, 0.2)" : "rgba(199, 238, 255, 0.08)"),
                  boxShadow: isHovered 
                    ? `0 10px 30px -10px ${plan.isPopular ? "rgba(0, 119, 192, 0.3)" : "rgba(199, 238, 255, 0.15)"}`
                    : "none"
                }}
              >
                {plan.isPopular && (
                  <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#0077C0] to-transparent" />
                )}

                <div className="p-8">
                  {/* Badge */}
                  <div className="flex justify-between items-center mb-6">
                    <span 
                      className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full border`}
                      style={{
                        backgroundColor: plan.isPopular ? "rgba(0, 119, 192, 0.1)" : "rgba(199, 238, 255, 0.05)",
                        borderColor: plan.isPopular ? "rgba(0, 119, 192, 0.3)" : "rgba(199, 238, 255, 0.1)",
                        color: plan.isPopular ? "#C7EEFF" : "#A0AEC0"
                      }}
                    >
                      {plan.badge}
                    </span>
                    {plan.isPopular && (
                      <span className="flex items-center gap-1 text-[10px] text-yellow-400 font-bold tracking-wider uppercase">
                        <Star size={12} fill="currentColor" /> POPULAR
                      </span>
                    )}
                  </div>

                  {/* Plan Name */}
                  <h3 className="text-xl font-bold tracking-tight text-[#FAFAFA]">
                    {plan.name}
                  </h3>
                  <div className="text-[10px] font-mono text-[#C7EEFF]/60 mb-3 mt-0.5 uppercase tracking-wider">
                    App Tier: {plan.appTier}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-[#A0AEC0] mb-6 h-10">
                    {plan.description}
                  </p>

                  {/* Pricing */}
                  <div className="flex items-baseline gap-1.5 mb-8">
                    <span className="text-4xl font-extrabold tracking-tight text-[#FAFAFA]">
                      {monetizationEnabled ? plan.price : "₹0"}
                    </span>
                    <span className="text-xs text-[#A0AEC0]">
                      / {plan.period}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="h-[1px] bg-[rgba(199,238,255,0.08)] mb-8" />

                  {/* Features List */}
                  <ul className="space-y-4">
                    {plan.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-start gap-3">
                        <div className={`rounded-full p-0.5 mt-0.5 flex-shrink-0 ${plan.isPopular ? "bg-[#0077C0]/20 text-[#C7EEFF]" : "bg-[#121212] text-[#A0AEC0]"}`}>
                          <Check size={12} />
                        </div>
                        <span className="text-xs text-[#FAFAFA]/90">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Card Action Button */}
                <div className="p-8 pt-0">
                  <button 
                    disabled={!monetizationEnabled}
                    onClick={() => setSelectedPlan(plan)}
                    className={`w-full py-3 px-4 rounded-xl text-xs font-bold tracking-wide uppercase transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                    style={{
                      backgroundColor: plan.isPopular ? P.blue : P.gray,
                      color: P.white,
                      border: plan.isPopular ? "none" : `1px solid ${P.border}`,
                    }}
                  >
                    <span>{monetizationEnabled ? "Get Activation Key" : "Free Access Active"}</span>
                    <ChevronRight size={14} />
                  </button>
                </div>

              </motion.div>
            );
          })}
        </div>

        {/* ── Checkout Modal ── */}
        <AnimatePresence>
          {selectedPlan && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-lg p-8 rounded-3xl border border-[rgba(199,238,255,0.1)] relative overflow-hidden"
                style={{ background: "#0D0D0D" }}
              >
                {/* Close Button */}
                <button
                  onClick={() => {
                    setSelectedPlan(null);
                    setLicenseKey(null);
                    setPaymentError(null);
                    setCouponDiscount(null);
                    setCouponCode("");
                  }}
                  className="absolute top-4 right-4 text-[#A0AEC0] hover:text-[#FAFAFA] font-mono text-lg cursor-pointer"
                >
                  ✕
                </button>

                {!licenseKey ? (
                  <>
                    <h3 className="text-xl font-black font-outfit uppercase tracking-wider mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[#C7EEFF] to-[#0077C0]">
                      Secure Checkout
                    </h3>
                    <p className="text-xs text-[#A0AEC0] mb-6">
                      Bypassing peer limits for <span className="text-[#C7EEFF] font-bold">{selectedPlan.name}</span>
                    </p>

                    <form onSubmit={handleCheckout} className="space-y-4">
                      {/* Recipient Email */}
                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-wider opacity-60 block mb-1 text-sky-400">Recipient Email Address</label>
                        <input
                          type="email"
                          required
                          value={checkoutEmail}
                          onChange={(e) => setCheckoutEmail(e.target.value)}
                          placeholder="e.g. yourname@vitstudent.ac.in"
                          className="w-full text-xs rounded-xl px-4 py-3 border border-white/10 bg-white/5 focus:outline-none focus:ring-1 focus:ring-sky-400"
                        />
                        <p className="text-[9px] text-[#A0AEC0] mt-1">Activation key will be tied to this email and sent here.</p>
                      </div>

                      {/* Coupon Code & Referral Code Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Coupon Code */}
                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-wider opacity-60 block mb-1">Coupon Code</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={couponCode}
                              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                              placeholder="PROMO50"
                              className="w-full text-xs rounded-xl px-3 py-2.5 border border-white/10 bg-white/5 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={validateCoupon}
                              disabled={isValidatingCoupon || !couponCode}
                              className="px-3 rounded-xl text-[10px] font-bold bg-[#0077C0] text-white cursor-pointer disabled:opacity-40"
                            >
                              Apply
                            </button>
                          </div>
                          {couponDiscount && <p className="text-[9px] text-emerald-400 mt-1">Valid code! {couponDiscount} discount applied.</p>}
                          {couponError && <p className="text-[9px] text-red-400 mt-1">{couponError}</p>}
                        </div>

                        {/* Referral Code */}
                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-wider opacity-60 block mb-1">Referral Code</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={referralCode}
                              onChange={(e) => {
                                setReferralCode(e.target.value.toUpperCase());
                                setIsReferralValid(false);
                                setReferralCodeError(null);
                              }}
                              placeholder="FRIENDCODE"
                              className="w-full text-xs rounded-xl px-3 py-2.5 border border-white/10 bg-white/5 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={validateReferralCode}
                              disabled={isValidatingReferral || !referralCode}
                              className="px-3 rounded-xl text-[10px] font-bold bg-[#0077C0] text-white cursor-pointer disabled:opacity-40"
                            >
                              Apply
                            </button>
                          </div>
                          {isReferralValid && <p className="text-[9px] text-emerald-400 mt-1">Referral active! 10% discount applied.</p>}
                          {referralCodeError && <p className="text-[9px] text-red-400 mt-1">{referralCodeError}</p>}
                        </div>
                      </div>

                      {/* Pricing Summary */}
                      <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="opacity-60">Base Price</span>
                          <span>₹{pricingDetails.base}</span>
                        </div>
                        {couponDiscount && (
                          <div className="flex justify-between text-emerald-400">
                            <span>Coupon Discount {pricingDetails.applied !== "coupon" && <span className="text-[9px] opacity-60">(Ignored - Referral is higher)</span>}</span>
                            <span>{pricingDetails.applied === "coupon" ? `-₹${pricingDetails.discount.toFixed(2)}` : "₹0.00"}</span>
                          </div>
                        )}
                        {isReferralValid && (
                          <div className="flex justify-between text-sky-400">
                            <span>Referral Bonus (10% Off) {pricingDetails.applied !== "referral" && <span className="text-[9px] opacity-60">(Ignored - Coupon is higher)</span>}</span>
                            <span>{pricingDetails.applied === "referral" ? `-₹${pricingDetails.refDiscount.toFixed(2)}` : "₹0.00"}</span>
                          </div>
                        )}
                        <div className="h-[1px] bg-white/10 my-2" />
                        <div className="flex justify-between font-bold text-sm">
                          <span>Total Amount</span>
                          <span style={{ color: P.sky }}>₹{pricingDetails.total.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Error display */}
                      {paymentError && (
                        <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs">
                          {paymentError}
                        </div>
                      )}

                      {/* Pay Button */}
                      <button
                        type="submit"
                        disabled={isProcessingPayment}
                        className="w-full py-3.5 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 transition-colors shadow-md shadow-sky-600/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <CreditCard size={14} />
                        {isProcessingPayment ? "Processing Security Bridge..." : `Pay ₹${pricingDetails.total.toFixed(2)} with Razorpay`}
                      </button>
                    </form>
                  </>
                ) : (
                  // Purchase Success / License Key Delivered Screen
                  <div className="text-center space-y-6 py-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                      <Shield size={32} />
                    </div>

                    <div>
                      <h3 className="text-2xl font-black font-outfit uppercase text-[#FAFAFA]">Payment Verified</h3>
                      <p className="text-xs text-[#A0AEC0] mt-1">Your activation key is ready</p>
                    </div>

                    <div className="p-5 rounded-2xl border border-emerald-500/20 bg-[#121212] relative group">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 mb-2">Activation Key</div>
                      <div className="font-mono text-sm tracking-wider font-extrabold text-[#C7EEFF] select-all break-all pr-8">
                        {licenseKey}
                      </div>
                      <button
                        onClick={() => copyToClipboard(licenseKey, setIsCopied)}
                        className="absolute right-4 bottom-5 text-[#A0AEC0] hover:text-white cursor-pointer"
                        title="Copy Key"
                      >
                        {isCopied ? <span className="text-[9px] text-emerald-400 font-bold uppercase">Copied</span> : <Copy size={16} />}
                      </button>
                    </div>

                    <div className="text-left text-xs space-y-2.5 p-4.5 rounded-2xl border border-white/5 bg-white/[0.01]">
                      <div className="font-bold flex items-center gap-1.5" style={{ color: P.sky }}>
                        <Zap size={14} /> How to activate:
                      </div>
                      <ol className="list-decimal list-inside space-y-1 text-[#A0AEC0] text-[11px]">
                        <li>Open the LANpad Desktop App.</li>
                        <li>Click on the Lock / Activation Screen.</li>
                        <li>Paste your key and press <kbd className="bg-white/10 px-1 py-0.5 rounded text-[10px]">Enter</kbd>.</li>
                      </ol>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedPlan(null);
                        setLicenseKey(null);
                        setCouponDiscount(null);
                        setCouponCode("");
                      }}
                      className="w-full py-3.5 rounded-xl text-xs font-bold text-white bg-neutral-800 hover:bg-neutral-700 transition-colors cursor-pointer"
                    >
                      Done & Close
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── Feature Comparison Section ── */}
        <section className="border border-[rgba(199,238,255,0.08)] rounded-3xl bg-[#050505]/40 backdrop-blur-md p-10 mb-24 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#0077C0]/5 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row items-start justify-between gap-12">
            <div className="max-w-md">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
                What does a <span className="text-[#C7EEFF]">Pass</span> unlock?
              </h2>
              <p className="text-sm text-[#A0AEC0] mb-6 leading-relaxed">
                Unlock full hardware accessibility parameters to bypass campus Wi-Fi AP Isolation and institutional proxies instantly.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-[rgba(199,238,255,0.05)] bg-[#121212]/30">
                  <Globe className="text-[#C7EEFF] mb-2" size={20} />
                  <h4 className="text-xs font-bold mb-1">Tunneling</h4>
                  <p className="text-[10px] text-[#A0AEC0]">External secure bridges.</p>
                </div>
                <div className="p-4 rounded-xl border border-[rgba(199,238,255,0.05)] bg-[#121212]/30">
                  <Key className="text-[#0077C0] mb-2" size={20} />
                  <h4 className="text-xs font-bold mb-1">Activation</h4>
                  <p className="text-[10px] text-[#A0AEC0]">Instant lifetime validity.</p>
                </div>
              </div>
            </div>

            <div className="flex-1 w-full space-y-6">
              <div className="flex gap-4 p-4 rounded-2xl border border-[rgba(199,238,255,0.05)] bg-[#121212]/20 hover:border-[rgba(199,238,255,0.15)] transition-all">
                <Clock className="text-[#C7EEFF] flex-shrink-0" size={24} />
                <div>
                  <h4 className="text-sm font-bold mb-1">Validity-based Licensing</h4>
                  <p className="text-xs text-[#A0AEC0] leading-relaxed">
                    License keys persist locally inside the app. You only enter them once; the app automatically manages reconnects and credentials.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-2xl border border-[rgba(199,238,255,0.05)] bg-[#121212]/20 hover:border-[rgba(199,238,255,0.15)] transition-all">
                <Zap className="text-[#0077C0] flex-shrink-0" size={24} />
                <div>
                  <h4 className="text-sm font-bold mb-1">Uncapped Speeds</h4>
                  <p className="text-xs text-[#A0AEC0] leading-relaxed">
                    High-performance cloud tunnels run at maximum bandwidth over Port 443, making downloads and clipboard transfer incredibly fast.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-2xl border border-[rgba(199,238,255,0.05)] bg-[#121212]/20 hover:border-[rgba(199,238,255,0.15)] transition-all">
                <BookOpen className="text-emerald-400 flex-shrink-0" size={24} />
                <div>
                  <h4 className="text-sm font-bold mb-1">College Isolation Bypass</h4>
                  <p className="text-xs text-[#A0AEC0] leading-relaxed">
                    Purpose-built algorithms automatically bypass routers running peer-to-peer isolation filters in academic campuses.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── USER REFERRAL PROGRAM DASHBOARD ── */}
        <section id="referrals" className="border border-[rgba(199,238,255,0.08)] rounded-3xl bg-[#080808] p-10 mb-24 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-[#0077C0]/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sky-500/20 bg-sky-500/5 mb-4">
                <Award size={14} className="text-sky-400" />
                <span className="text-xs font-semibold tracking-wider uppercase text-sky-400">GlidePass Referral Rewards</span>
              </div>
              <h2 className="text-3xl font-black tracking-tight mb-3">
                Refer Friends, Get Free <span className="text-[#C7EEFF]">Pro Extension</span>
              </h2>
              <p className="text-sm text-[#A0AEC0] max-w-xl mx-auto">
                Give your campus peers 10% off any premium subscription. For every successful referral activation, you get <span className="text-sky-400 font-bold">{rewardDays} Days</span> added to your license key!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              {/* Form & Link Generation */}
              <div className="md:col-span-5 p-6 rounded-2xl border border-white/5 bg-[#121212]/30 space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: P.sky }}>
                  <Share2 size={16} /> Get Your Invite Code
                </h3>
                <form onSubmit={fetchReferralDetails} className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider opacity-60 block mb-1">Your Registered Email</label>
                    <input
                      type="email"
                      required
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="e.g. student@vitstudent.ac.in"
                      className="w-full text-xs rounded-xl px-3 py-2.5 border border-white/10 bg-white/5 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isGeneratingReferral}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-black bg-[#C7EEFF] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                  >
                    {isGeneratingReferral ? "Generating Secure Token..." : "Get My Referral Link"}
                  </button>
                </form>

                {referralError && (
                  <p className="text-xs text-red-400">{referralError}</p>
                )}

                {userReferralCode && (
                  <div className="pt-4 border-t border-white/10 space-y-3">
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-white/50 mb-1">Your Code</div>
                      <div className="font-mono text-sm font-bold text-sky-400 bg-black/40 px-3 py-2 rounded-xl flex justify-between items-center">
                        <span>{userReferralCode}</span>
                        <button
                          onClick={() => copyToClipboard(userReferralCode, () => {})}
                          className="text-[10px] hover:underline cursor-pointer"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-white/50 mb-1">Direct Share URL</div>
                      <div className="font-mono text-[10px] bg-black/40 px-3 py-2.5 rounded-xl flex justify-between items-center text-white/70 overflow-hidden text-ellipsis">
                        <span className="truncate">{`https://${window.location.host}/pricing?ref=${userReferralCode}`}</span>
                        <button
                          onClick={() => copyToClipboard(`https://${window.location.host}/pricing?ref=${userReferralCode}`, setIsLinkCopied)}
                          className="text-[10px] hover:underline shrink-0 pl-2 cursor-pointer"
                        >
                          {isLinkCopied ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Referral Statistics */}
              <div className="md:col-span-7 p-6 rounded-2xl border border-white/5 bg-[#121212]/30 space-y-4 min-h-[220px]">
                <h3 className="text-sm font-bold flex items-center gap-2 text-emerald-400">
                  <Users size={16} /> Referrals Tracked ({userReferrals.length})
                </h3>

                {userReferralCode ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-[9px] uppercase tracking-wider text-white/50">
                          <th className="pb-2">Friend Email</th>
                          <th className="pb-2">Status</th>
                          <th className="pb-2 text-right">Registered</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userReferrals.map((ref, idx) => (
                          <tr key={idx} className="border-b border-white/5">
                            <td className="py-2.5 font-mono text-[11px] text-white/90">{ref.referred_email}</td>
                            <td className="py-2.5">
                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                                ref.status === "rewarded" 
                                  ? "bg-emerald-500/10 text-emerald-400" 
                                  : "bg-yellow-500/10 text-yellow-400"
                              }`}>
                                {ref.status === "rewarded" ? `Rewarded (+${rewardDays}d)` : ref.status}
                              </span>
                            </td>
                            <td className="py-2.5 text-right font-mono text-[10px] text-white/40">
                              {new Date(ref.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                        {userReferrals.length === 0 && (
                          <tr>
                            <td colSpan={3} className="text-center py-8 text-white/30 text-xs">
                              Your link hasn't been used yet. Share it around to earn rewards!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-white/30">
                    <Gift size={32} className="mb-2 opacity-50" />
                    <p className="text-xs">Enter your email on the left to track referred friends and subscription credit rewards.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ Section ── */}
        <section className="max-w-3xl mx-auto mb-20">
          <h2 className="text-2xl font-bold tracking-tight mb-8 text-center flex items-center justify-center gap-2">
            <HelpCircle size={22} className="text-[#C7EEFF]" />
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="p-6 rounded-2xl border border-[rgba(199,238,255,0.06)] bg-[#121212]/20">
                <h4 className="text-sm font-bold text-[#FAFAFA] mb-2">{faq.q}</h4>
                <p className="text-xs text-[#A0AEC0] leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[rgba(199,238,255,0.08)] py-8 text-center text-xs text-[#A0AEC0]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} GlidePass. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-[#FAFAFA] transition-colors">Downloads</Link>
            <Link href="/admin" className="hover:text-[#FAFAFA] transition-colors">Admin Portal</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
