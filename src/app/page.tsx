import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Shield, Zap, Code, BarChart3, ChevronRight, Check } from "lucide-react";

export default async function Home() {
  const session = await getServerSession(authOptions);
  
  if (session) {
    redirect("/analyze");
  }

  return (
    <div className="bg-white dark:bg-slate-900 transition-colors overflow-hidden">
      
      {/* Hero Section */}
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#4338ca] to-[#a855f7] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
        </div>
        <div className="mx-auto max-w-2xl pt-8 pb-12 sm:pt-12 lg:pt-16 lg:pb-20 text-center">
          
          <div className="flex justify-center mb-6">
            <div className="w-28 h-28 flex items-center justify-center">
              <img src="/brand_logo.png" alt="Bug Predict Logo" className="w-full h-full object-contain drop-shadow-2xl" />
            </div>
          </div>

          <div className="hidden sm:mb-8 sm:flex sm:justify-center">
            <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-gray-600 dark:text-gray-300 ring-1 ring-gray-900/10 dark:ring-white/10 hover:ring-gray-900/20 dark:hover:ring-white/20">
              Announcing our new multi-language support. <Link href="/login" className="font-semibold text-indigo-600 dark:text-indigo-400"><span className="absolute inset-0" aria-hidden="true"></span>Read more <span aria-hidden="true">&rarr;</span></Link>
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
            Bug Predict
          </h1>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-800 dark:text-gray-100 sm:text-4xl">
            Predict Software Risk <span className="text-indigo-600 dark:text-indigo-400">Before Deployment</span>
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
            Bug Predict uses XGBoost Machine Learning and the precise Kaggle defect dataset metrics to scan your GitHub repositories, analyzing code complexity, contributor churn, and architectural patterns to pinpoint exactly where bugs are most likely to emerge.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link href="/signup" className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors">
              Get Started for Free
            </Link>
            <Link href="/login" className="text-sm font-semibold leading-6 text-gray-900 dark:text-white flex items-center group">
              Login to Dashboard <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 sm:py-16 bg-gray-50 dark:bg-slate-800/50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-indigo-600 dark:text-indigo-400">Ship Faster, Safer</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Everything you need to analyze code health
            </p>
          </div>
          <div className="mx-auto mt-10 sm:mt-12 lg:mt-16 lg:max-w-4xl">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-12">
              
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  XGBoost Defect Prediction
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-300">
                  Our models evaluate cyclomatic complexity, churn rates, and team contribution overlap based on the Kaggle Software Defect Prediction Dataset to grade each file's risk level.
                </dd>
              </div>

              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                    <Code className="h-6 w-6 text-white" />
                  </div>
                  Multi-Language Support
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-300">
                  We seamlessly analyze Python, JavaScript, TypeScript, Java, C++, Go, and more using robust multi-language parsing.
                </dd>
              </div>

              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  Metrics Glossary
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-300">
                  <strong>LOC:</strong> Lines of Code (volume). <br/>
                  <strong>Complexity:</strong> Branching and looping depth.<br/>
                  <strong>Churn:</strong> Frequency of code edits.
                </dd>
              </div>

              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  Generative AI Explanations
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-300">
                  Powered by Google Gemini API, we don't just give you a number—we provide plain English explanations of why the code is risky and how to test it based on the XGBoost output.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
      
      {/* Pricing Section */}
      <div className="py-24 sm:py-32 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl sm:text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">Simple, transparent pricing</h2>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              Start for free, then choose a plan that fits your needs.
            </p>
          </div>
          <div className="mx-auto grid max-w-lg grid-cols-1 gap-6 lg:max-w-none lg:grid-cols-3">
            {/* Free Tier */}
            <div className="flex flex-col justify-between rounded-3xl bg-white dark:bg-slate-800 p-6 ring-1 ring-gray-200 dark:ring-slate-700 xl:p-8">
              <div>
                <h3 className="text-lg font-semibold leading-8 text-gray-900 dark:text-white">Free</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">Perfect for trying out the platform.</p>
                <p className="mt-4 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">$0</span>
                  <span className="text-sm font-semibold leading-6 text-gray-600 dark:text-gray-400">/forever</span>
                </p>
                <ul role="list" className="mt-6 space-y-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                  <li className="flex gap-x-3"><Check className="h-6 w-5 flex-none text-indigo-600" />3 Free Analyses</li>
                  <li className="flex gap-x-3"><Check className="h-6 w-5 flex-none text-indigo-600" />Basic Risk Metrics</li>
                </ul>
              </div>
              <Link href="/signup" className="mt-8 block rounded-md py-2 px-3 text-center text-sm font-semibold leading-6 text-indigo-600 ring-1 ring-inset ring-indigo-200 hover:ring-indigo-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Get started</Link>
            </div>

            {/* Starter Tier */}
            <div className="flex flex-col justify-between rounded-3xl bg-indigo-600 p-6 ring-1 ring-indigo-600 xl:p-8 shadow-xl">
              <div>
                <h3 className="text-lg font-semibold leading-8 text-white">Starter</h3>
                <p className="mt-2 text-sm leading-6 text-indigo-100">For small projects and single repositories.</p>
                <p className="mt-4 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight text-white">$9</span>
                  <span className="text-sm font-semibold leading-6 text-indigo-200">/one-time</span>
                </p>
                <ul role="list" className="mt-6 space-y-3 text-sm leading-6 text-indigo-100">
                  <li className="flex gap-x-3"><Check className="h-6 w-5 flex-none text-white" />5 Total Analyses</li>
                  <li className="flex gap-x-3"><Check className="h-6 w-5 flex-none text-white" />AI Explanations</li>
                  <li className="flex gap-x-3"><Check className="h-6 w-5 flex-none text-white" />Full XGBoost Modeling</li>
                </ul>
              </div>
              <Link href="/signup" className="mt-6 block rounded-md bg-white py-2 px-3 text-center text-sm font-semibold leading-6 text-indigo-600 shadow-sm hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Buy Starter</Link>
            </div>

            {/* Pro Tier */}
            <div className="flex flex-col justify-between rounded-3xl bg-white dark:bg-slate-800 p-6 ring-1 ring-gray-200 dark:ring-slate-700 xl:p-8">
              <div>
                <h3 className="text-lg font-semibold leading-8 text-gray-900 dark:text-white">Pro</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">Unlimited access for power users.</p>
                <p className="mt-4 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">$29</span>
                  <span className="text-sm font-semibold leading-6 text-gray-600 dark:text-gray-400">/month</span>
                </p>
                <ul role="list" className="mt-6 space-y-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                  <li className="flex gap-x-3"><Check className="h-6 w-5 flex-none text-indigo-600" />Unlimited Analyses</li>
                  <li className="flex gap-x-3"><Check className="h-6 w-5 flex-none text-indigo-600" />Priority AI Generation</li>
                  <li className="flex gap-x-3"><Check className="h-6 w-5 flex-none text-indigo-600" />History & Trend Tracking</li>
                </ul>
              </div>
              <Link href="/signup" className="mt-8 block rounded-md py-2 px-3 text-center text-sm font-semibold leading-6 text-indigo-600 ring-1 ring-inset ring-indigo-200 hover:ring-indigo-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Subscribe Monthly</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
