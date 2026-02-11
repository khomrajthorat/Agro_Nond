import Button from '../../components/ui/Button';
import { Link } from 'react-router-dom';

export default function Services() {
  return (
    <main className="min-h-screen bg-[var(--surface)]">
      {/* Hero Section */}
      <section className="relative py-24 gradient-bg-subtle overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-10 left-20 w-64 h-64 bg-[var(--primary)]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-48 h-48 bg-[var(--primary)]/5 rounded-full blur-3xl" />
        </div>

        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-white border border-[var(--border)] text-sm font-semibold text-[var(--primary)] mb-6 animate-fade-in-down">
              Our Services
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 animate-fade-in-up">
              Empowering
              <span className="gradient-text"> Agriculture</span>
            </h1>
            <p className="text-xl text-[var(--text-secondary)] animate-fade-in-up delay-100 mb-8">
              Connecting Farmers and Traders through a transparent, efficient, and digital marketplace.
            </p>
          </div>
        </div>
      </section>

      {/* Main Services Split */}
      <section className="py-16 -mt-10 relative z-20">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">

            {/* Farmer Service Card */}
            <div className="group relative p-8 rounded-3xl bg-white border border-[var(--border)] shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-green-600"></div>

              <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <FarmerIcon className="w-8 h-8 text-green-600" />
              </div>

              <h2 className="text-3xl font-bold mb-4 text-gray-900">For Farmers</h2>
              <p className="text-[var(--text-secondary)] mb-8 text-lg">
                Get the best value for your produce with our transparent auction system. Track your sales, payments, and history in real-time.
              </p>

              <ul className="space-y-4 mb-8">
                {[
                  'Easy Registration & Profile Management',
                  'Real-time Auction Live Rates',
                  'Digital Payment Tracking',
                  'Transparent Weighing & Billing'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-[var(--text-secondary)]">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                <Link to="/login" className="block w-full">
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20">
                    Farmer Login / Register
                  </Button>
                </Link>
                <p className="text-center text-sm text-[var(--text-secondary)] mt-3">
                  New here? Click to register instantly.
                </p>
              </div>
            </div>

            {/* Trader Service Card */}
            <div className="group relative p-8 rounded-3xl bg-white border border-[var(--border)] shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>

              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <TraderIcon className="w-8 h-8 text-blue-600" />
              </div>

              <h2 className="text-3xl font-bold mb-4 text-gray-900">For Traders</h2>
              <p className="text-[var(--text-secondary)] mb-8 text-lg">
                Access a wide variety of fresh produce directly from farmers. Manage your purchases, invoices, and payments digitally.
              </p>

              <ul className="space-y-4 mb-8">
                {[
                  'Quick Business Registration',
                  'Access to Fresh Commodity Auctions',
                  'Digital Invoicing & Billing',
                  'Secure Payment Gateways'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-[var(--text-secondary)]">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                <Link to="/login" className="block w-full">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20">
                    Trader Login / Register
                  </Button>
                </Link>
                <p className="text-center text-sm text-[var(--text-secondary)] mt-3">
                  Join our network of trusted traders.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Trust/Support Section */}
      <section className="py-16 bg-white border-t border-[var(--border)]">
        <div className="container text-center">
          <h3 className="text-2xl font-bold mb-8">Trusted by Thousands of Farmers & Traders</h3>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Placeholders for logos or just stats icons if logos aren't available */}
            <div className="flex flex-col items-center">
              <div className="text-4xl font-bold text-[var(--primary)] mb-2">1000+</div>
              <div className="text-sm font-medium uppercase tracking-wider">Farmers</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-4xl font-bold text-[var(--primary)] mb-2">500+</div>
              <div className="text-sm font-medium uppercase tracking-wider">Daily Auctions</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-4xl font-bold text-[var(--primary)] mb-2">100%</div>
              <div className="text-sm font-medium uppercase tracking-wider">Transparency</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

// Icon Components
function FarmerIcon({ className = "w-8 h-8" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function TraderIcon({ className = "w-8 h-8" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}
