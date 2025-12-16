import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "../components/Common/Navbar"; 

const slides = [
  {
    image:
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1600&q=80",
    title: "Connecting Customers with Trusted Service Providers",
    description:
      "Find skilled plumbers, cleaners, electricians, and relocation assistants quickly and securely.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
    title: "Reliable Home Services at Your Fingertips",
    description:
      "Search, chat, share images, and agree on service details — all in one platform.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?auto=format&fit=crop&w=1600&q=80",
    title: "Empowering Service Providers",
    description:
      "Showcase skills, set prices, receive bookings, and collaborate with other professionals.",
  },
];

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Dynamically load Google Fonts
  useEffect(() => {
    if (!document.getElementById("gf-poppins")) {
      const link = document.createElement("link");
      link.id = "gf-poppins";
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif" }} className="min-h-screen bg-gray-50">
      {/* ================= NAVBAR ================= */}
      <Navbar />

      {/* ================= HERO SLIDER ================= */}
      <header className="relative w-full h-[45vh] mt-16 overflow-hidden">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/60"></div>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-6">
              <h1 className="text-3xl md:text-4xl font-semibold mb-4 max-w-4xl">
                {slide.title}
              </h1>
              <p className="text-base md:text-lg max-w-3xl mb-6 text-gray-200 font-light">
                {slide.description}
              </p>
              <div className="flex gap-4 flex-wrap justify-center">
                <Link
                  to="/register"
                  className="bg-indigo-600 hover:bg-indigo-700 px-7 py-2.5 rounded-lg font-medium shadow transition"
                >
                  Get Started
                </Link>
                <Link
                  to="/login"
                  className="border border-white px-7 py-2.5 rounded-lg font-medium hover:bg-white hover:text-gray-900 transition"
                >
                  Login
                </Link>
              </div>
            </div>
          </div>
        ))}

        {/* Indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 z-20">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full ${
                index === currentSlide ? "bg-white" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      </header>

      {/* ================= FEATURES ================= */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-semibold text-center mb-12">
          Why Choose Proxify?
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            title="Verified Service Providers"
            description="Access trusted professionals with transparent profiles and service costs."
          />
          <FeatureCard
            title="Real-Time Communication"
            description="Chat, share images, and exchange contact details securely."
          />
          <FeatureCard
            title="Location-Based Search"
            description="Google Maps integration helps users find nearby providers efficiently."
          />
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">
            How the System Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <StepCard
              step="1"
              title="Search Services"
              description="Customers search for required services and view available providers."
            />
            <StepCard
              step="2"
              title="Chat & Agree"
              description="Discuss job details, share images, and agree on pricing."
            />
            <StepCard
              step="3"
              title="Service Delivery"
              description="The provider delivers the service and completes the booking."
            />
          </div>
        </div>
      </section>

      {/* ================= USER ROLES ================= */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">
          Platform User Roles
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <RoleCard
            title="Customers"
            description="Find reliable professionals and book services with confidence."
          />
          <RoleCard
            title="Service Providers"
            description="Advertise skills, set pricing, and grow your client base."
          />
          <RoleCard
            title="Administrators"
            description="Monitor system activity and ensure accountability."
          />
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="bg-gray-900 text-gray-300 py-6 text-center text-sm">
        © {new Date().getFullYear()} Proxify | Final Year Project
      </footer>
    </div>
  );
}

/* ================= REUSABLE COMPONENTS ================= */

function FeatureCard({ title, description }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-gray-600 font-light">{description}</p>
    </div>
  );
}

function StepCard({ step, title, description }) {
  return (
    <div className="p-6 rounded-lg shadow bg-gray-50">
      <div className="text-4xl font-bold text-indigo-600 mb-4">{step}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function RoleCard({ title, description }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition text-center">
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
