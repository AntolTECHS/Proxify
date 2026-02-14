import Navbar from "../components/Common/Navbar";

export default function AboutUs() {
  return (
    <div
      className="min-h-screen bg-gray-50 pt-24"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <Navbar />

      {/* ================= HERO SECTION ================= */}
      <section
        className="relative text-white py-32 px-6 text-center bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1590608897129-79c2e25baf4c?auto=format&fit=crop&w=1600&q=80')",
        }}
      >
        {/* Dark overlay for contrast */}
        <div className="absolute inset-0 bg-emerald-900/70"></div>

        {/* Text content */}
        <div className="relative z-10 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            About <span className="text-emerald-300">Proxify</span>
          </h1>
          <p className="text-lg md:text-xl font-light leading-relaxed">
            Connecting customers with trusted service providers and empowering
            professionals to grow their business efficiently.
          </p>
        </div>
      </section>

      {/* ================= MISSION & VISION ================= */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-10">
          <InfoCard
            title="Our Mission"
            description="Our mission is to create a secure, reliable, and easy-to-use platform where customers can find skilled professionals for home and business services while providing service providers the tools they need to showcase expertise, manage bookings, and grow their clientele."
          />
          <InfoCard
            title="Our Vision"
            description="We envision a world where finding trustworthy services is fast and hassle-free, and service providers are empowered to thrive without worrying about visibility, marketing, or client acquisition. Proxify bridges the gap between demand and expertise."
          />
        </div>
      </section>

      {/* ================= CORE VALUES ================= */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-gray-800 text-center mb-14">
          Our Core Values
        </h2>
        <div className="grid md:grid-cols-3 gap-10">
          <ValueCard
            title="Trust & Transparency"
            description="Every provider is verified, and communication between customers and professionals is always clear and secure."
          />
          <ValueCard
            title="Reliability"
            description="We prioritize consistent service quality, dependable scheduling, and secure payments."
          />
          <ValueCard
            title="Empowerment"
            description="We give professionals the tools they need to manage services, connect with clients, and scale their business."
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

function InfoCard({ title, description }) {
  return (
    <div className="bg-white p-8 rounded-xl shadow hover:shadow-xl transition transform hover:-translate-y-1">
      <h3 className="text-2xl font-semibold mb-4 text-emerald-700">{title}</h3>
      <p className="text-gray-700 font-light leading-relaxed">{description}</p>
    </div>
  );
}

function ValueCard({ title, description }) {
  return (
    <div className="bg-emerald-50 p-8 rounded-xl shadow hover:shadow-xl transition transform hover:-translate-y-1 text-center">
      <h3 className="text-xl font-semibold mb-4 text-emerald-700">{title}</h3>
      <p className="text-gray-700 font-light leading-relaxed">{description}</p>
    </div>
  );
}
