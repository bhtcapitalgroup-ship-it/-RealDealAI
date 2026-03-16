/**
 * Multi-step onboarding wizard — shown after first login.
 *
 * Steps:
 *  1. Investment types (rental, BRRRR, flip, wholesale)
 *  2. Target markets (city/state multi-select)
 *  3. Budget range (min/max sliders)
 *  4. Criteria (cap rate, cash flow, property types)
 *  5. Experience level
 *  6. Auto-created alerts summary
 */

import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useSavePreferences,
  useRecommendedMarkets,
  useAutoCreateAlerts,
  type Preferences,
  type CreatedAlert,
} from "@/hooks/useOnboarding";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 6;

const INVESTMENT_TYPES = [
  {
    id: "rental",
    label: "Buy & Hold Rental",
    desc: "Long-term cash flow from rental income",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
      </svg>
    ),
  },
  {
    id: "brrrr",
    label: "BRRRR Strategy",
    desc: "Buy, Rehab, Rent, Refinance, Repeat",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
      </svg>
    ),
  },
  {
    id: "flip",
    label: "Fix & Flip",
    desc: "Buy undervalued, renovate, sell for profit",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
      </svg>
    ),
  },
  {
    id: "wholesale",
    label: "Wholesale",
    desc: "Find deals and assign contracts to buyers",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
  },
];

const POPULAR_MARKETS = [
  { city: "Austin", state: "TX" },
  { city: "Memphis", state: "TN" },
  { city: "Indianapolis", state: "IN" },
  { city: "Cleveland", state: "OH" },
  { city: "Birmingham", state: "AL" },
  { city: "Kansas City", state: "MO" },
  { city: "Jacksonville", state: "FL" },
  { city: "San Antonio", state: "TX" },
  { city: "Columbus", state: "OH" },
  { city: "St. Louis", state: "MO" },
  { city: "Nashville", state: "TN" },
  { city: "Raleigh", state: "NC" },
];

const PROPERTY_TYPES = [
  { id: "single_family", label: "Single Family" },
  { id: "multi_family", label: "Multi-Family" },
  { id: "condo", label: "Condo / Townhouse" },
  { id: "commercial", label: "Commercial" },
  { id: "mobile_home", label: "Mobile Home" },
  { id: "land", label: "Land" },
];

const EXPERIENCE_LEVELS = [
  {
    id: "beginner" as const,
    label: "Beginner",
    desc: "New to real estate investing. Looking to learn and find my first deal.",
    icon: (
      <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
      </svg>
    ),
  },
  {
    id: "intermediate" as const,
    label: "Intermediate",
    desc: "Own 1-10 properties. Looking to scale my portfolio efficiently.",
    icon: (
      <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
  },
  {
    id: "advanced" as const,
    label: "Advanced",
    desc: "10+ properties or full-time investor. Looking for an analytical edge.",
    icon: (
      <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
      </svg>
    ),
  },
];

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { save: savePreferences, loading: saving } = useSavePreferences();
  const { markets: recommendedMarkets, fetch: fetchMarkets } = useRecommendedMarkets();
  const { createAlerts, result: alertsResult, loading: creatingAlerts } = useAutoCreateAlerts();

  // State
  const [step, setStep] = useState(1);
  const [investmentTypes, setInvestmentTypes] = useState<string[]>([]);
  const [targetMarkets, setTargetMarkets] = useState<Array<{ city: string; state: string }>>([]);
  const [budgetMin, setBudgetMin] = useState(50000);
  const [budgetMax, setBudgetMax] = useState(500000);
  const [minCapRate, setMinCapRate] = useState(6);
  const [minCashFlow, setMinCashFlow] = useState(200);
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState<"beginner" | "intermediate" | "advanced" | null>(null);
  const [customMarketInput, setCustomMarketInput] = useState("");

  // Transition animation
  const [transitioning, setTransitioning] = useState(false);

  const animateStep = useCallback((newStep: number) => {
    setTransitioning(true);
    setTimeout(() => {
      setStep(newStep);
      setTransitioning(false);
    }, 200);
  }, []);

  // Save & advance
  const handleNext = useCallback(async () => {
    const prefs: Preferences = {
      onboarding_step: step,
    };

    switch (step) {
      case 1:
        prefs.investment_types = investmentTypes;
        break;
      case 2:
        prefs.target_markets = targetMarkets;
        break;
      case 3:
        prefs.budget_min = budgetMin;
        prefs.budget_max = budgetMax;
        break;
      case 4:
        prefs.min_cap_rate = minCapRate;
        prefs.min_cash_flow = minCashFlow;
        prefs.property_types = propertyTypes;
        break;
      case 5:
        prefs.experience_level = experienceLevel ?? "beginner";
        break;
      case 6:
        // Final step — mark onboarding complete
        prefs.onboarding_step = 6;
        await savePreferences(prefs);
        navigate("/");
        return;
    }

    await savePreferences(prefs);

    if (step === 4) {
      // Before showing step 5, fetch recommended markets
      fetchMarkets();
    }
    if (step === 5) {
      // Before showing step 6, auto-create alerts
      await createAlerts();
    }

    animateStep(step + 1);
  }, [
    step, investmentTypes, targetMarkets, budgetMin, budgetMax,
    minCapRate, minCashFlow, propertyTypes, experienceLevel,
    savePreferences, fetchMarkets, createAlerts, animateStep, navigate,
  ]);

  const handleBack = useCallback(() => {
    if (step > 1) animateStep(step - 1);
  }, [step, animateStep]);

  const handleSkip = useCallback(async () => {
    await savePreferences({ onboarding_step: 6 });
    navigate("/");
  }, [savePreferences, navigate]);

  // Toggle helpers
  const toggleInvestmentType = (id: string) => {
    setInvestmentTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const toggleMarket = (market: { city: string; state: string }) => {
    setTargetMarkets((prev) => {
      const exists = prev.some((m) => m.city === market.city && m.state === market.state);
      return exists
        ? prev.filter((m) => !(m.city === market.city && m.state === market.state))
        : [...prev, market];
    });
  };

  const addCustomMarket = () => {
    const parts = customMarketInput.split(",").map((s) => s.trim());
    if (parts.length === 2 && parts[0] && parts[1]) {
      toggleMarket({ city: parts[0], state: parts[1].toUpperCase() });
      setCustomMarketInput("");
    }
  };

  const togglePropertyType = (id: string) => {
    setPropertyTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-500">
            Step {step} of {TOTAL_STEPS}
          </span>
          <button
            onClick={handleSkip}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Skip setup
          </button>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content with fade transition */}
      <div
        className={`transition-all duration-200 ${
          transitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
        }`}
      >
        {/* Step 1: Investment Types */}
        {step === 1 && (
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              What type of investing interests you?
            </h1>
            <p className="text-slate-500 mb-8">
              Select all that apply. We will tailor your experience accordingly.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {INVESTMENT_TYPES.map((type) => {
                const selected = investmentTypes.includes(type.id);
                return (
                  <button
                    key={type.id}
                    onClick={() => toggleInvestmentType(type.id)}
                    className={`flex flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition-all ${
                      selected
                        ? "border-blue-500 bg-blue-50 shadow-md"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                    }`}
                  >
                    <div className={selected ? "text-blue-600" : "text-slate-400"}>
                      {type.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{type.label}</div>
                      <div className="text-sm text-slate-500 mt-1">{type.desc}</div>
                    </div>
                    {selected && (
                      <div className="absolute top-3 right-3">
                        <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Target Markets */}
        {step === 2 && (
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Where are you looking to invest?
            </h1>
            <p className="text-slate-500 mb-8">
              Select popular markets or add your own. You can always change these later.
            </p>

            <div className="flex flex-wrap gap-3 mb-6">
              {POPULAR_MARKETS.map((market) => {
                const selected = targetMarkets.some(
                  (m) => m.city === market.city && m.state === market.state
                );
                return (
                  <button
                    key={`${market.city}-${market.state}`}
                    onClick={() => toggleMarket(market)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      selected
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-white text-slate-700 border border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    {market.city}, {market.state}
                  </button>
                );
              })}
            </div>

            {/* Custom market input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customMarketInput}
                onChange={(e) => setCustomMarketInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomMarket()}
                placeholder="Add a market (e.g., Denver, CO)"
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                onClick={addCustomMarket}
                className="rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Add
              </button>
            </div>

            {targetMarkets.length > 0 && (
              <div className="mt-4 text-sm text-slate-500">
                {targetMarkets.length} market{targetMarkets.length !== 1 ? "s" : ""} selected
              </div>
            )}
          </div>
        )}

        {/* Step 3: Budget Range */}
        {step === 3 && (
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              What is your budget range?
            </h1>
            <p className="text-slate-500 mb-8">
              Set your minimum and maximum purchase price to find deals in your range.
            </p>

            <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="text-center">
                  <div className="text-sm text-slate-500 mb-1">Minimum</div>
                  <div className="text-2xl font-bold text-slate-900">{formatCurrency(budgetMin)}</div>
                </div>
                <div className="h-px flex-1 bg-slate-200 mx-4" />
                <div className="text-center">
                  <div className="text-sm text-slate-500 mb-1">Maximum</div>
                  <div className="text-2xl font-bold text-slate-900">{formatCurrency(budgetMax)}</div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-slate-600 block mb-2">
                    Minimum Price
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={2000000}
                    step={25000}
                    value={budgetMin}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setBudgetMin(Math.min(val, budgetMax - 25000));
                    }}
                    className="w-full accent-blue-600"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 block mb-2">
                    Maximum Price
                  </label>
                  <input
                    type="range"
                    min={25000}
                    max={5000000}
                    step={25000}
                    value={budgetMax}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setBudgetMax(Math.max(val, budgetMin + 25000));
                    }}
                    className="w-full accent-blue-600"
                  />
                </div>
              </div>

              <div className="flex justify-between mt-4 text-xs text-slate-400">
                <span>$0</span>
                <span>$5M+</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Criteria */}
        {step === 4 && (
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Set your investment criteria
            </h1>
            <p className="text-slate-500 mb-8">
              Define the minimum returns and property types you are interested in.
            </p>

            <div className="space-y-6">
              {/* Cap rate */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-semibold text-slate-700">
                    Minimum Cap Rate
                  </label>
                  <span className="text-lg font-bold text-blue-600">{minCapRate}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={15}
                  step={0.5}
                  value={minCapRate}
                  onChange={(e) => setMinCapRate(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between mt-1 text-xs text-slate-400">
                  <span>0%</span>
                  <span>15%</span>
                </div>
              </div>

              {/* Cash flow */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-semibold text-slate-700">
                    Minimum Monthly Cash Flow
                  </label>
                  <span className="text-lg font-bold text-blue-600">
                    ${minCashFlow}/mo
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2000}
                  step={50}
                  value={minCashFlow}
                  onChange={(e) => setMinCashFlow(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between mt-1 text-xs text-slate-400">
                  <span>$0</span>
                  <span>$2,000</span>
                </div>
              </div>

              {/* Property types */}
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-3">
                  Property Types
                </label>
                <div className="flex flex-wrap gap-3">
                  {PROPERTY_TYPES.map((type) => {
                    const selected = propertyTypes.includes(type.id);
                    return (
                      <button
                        key={type.id}
                        onClick={() => togglePropertyType(type.id)}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                          selected
                            ? "bg-blue-600 text-white shadow-md"
                            : "bg-white text-slate-700 border border-slate-200 hover:border-blue-300"
                        }`}
                      >
                        {type.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Experience Level */}
        {step === 5 && (
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              What is your experience level?
            </h1>
            <p className="text-slate-500 mb-8">
              This helps us tailor insights and recommendations to your needs.
            </p>

            <div className="space-y-4">
              {EXPERIENCE_LEVELS.map((level) => {
                const selected = experienceLevel === level.id;
                return (
                  <button
                    key={level.id}
                    onClick={() => setExperienceLevel(level.id)}
                    className={`w-full flex items-center gap-5 rounded-xl border-2 p-6 text-left transition-all ${
                      selected
                        ? "border-blue-500 bg-blue-50 shadow-md"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                    }`}
                  >
                    <div className={`flex-shrink-0 ${selected ? "text-blue-600" : "text-slate-400"}`}>
                      {level.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 text-lg">{level.label}</div>
                      <div className="text-sm text-slate-500 mt-1">{level.desc}</div>
                    </div>
                    {selected && (
                      <svg className="h-6 w-6 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Show recommended markets preview */}
            {recommendedMarkets.length > 0 && (
              <div className="mt-8 p-4 rounded-lg bg-blue-50 border border-blue-100">
                <h3 className="font-semibold text-blue-900 mb-2">
                  Recommended markets for you
                </h3>
                <div className="flex flex-wrap gap-2">
                  {recommendedMarkets.map((m) => (
                    <span
                      key={`${m.city}-${m.state}`}
                      className="rounded-full bg-white px-3 py-1 text-xs font-medium text-blue-700 border border-blue-200"
                    >
                      {m.city}, {m.state} ({m.cap_rate}% cap)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 6: Auto-created alerts */}
        {step === 6 && (
          <div>
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                You are all set!
              </h1>
              <p className="text-slate-500">
                We have created deal alerts based on your preferences. You will be notified when matching deals appear.
              </p>
            </div>

            {creatingAlerts ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                <span className="ml-3 text-slate-500">Creating your alerts...</span>
              </div>
            ) : alertsResult ? (
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-700 mb-3">
                  {alertsResult.alerts_created} alert{alertsResult.alerts_created !== 1 ? "s" : ""} created
                </h3>
                {alertsResult.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{alert.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {Object.entries(alert.filters)
                          .slice(0, 3)
                          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                          .join(" | ")}
                      </div>
                    </div>
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      Active
                    </span>
                  </div>
                ))}

                <p className="text-sm text-slate-400 mt-4 text-center">
                  You can customize these alerts anytime from your dashboard.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-10">
        <button
          onClick={handleBack}
          disabled={step === 1}
          className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${
            step === 1
              ? "text-slate-300 cursor-not-allowed"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back
        </button>

        <button
          onClick={handleNext}
          disabled={saving || creatingAlerts}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50"
        >
          {saving || creatingAlerts ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Saving...
            </>
          ) : step === TOTAL_STEPS ? (
            <>
              Go to Dashboard
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </>
          ) : (
            <>
              Continue
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
