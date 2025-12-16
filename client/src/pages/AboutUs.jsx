import Navbar from "../components/Common/Navbar";

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <Navbar />

      {/* HERO SECTION */}
      <section className="relative bg-teal-600 text-white py-20 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">About Proxify</h1>
        <p className="max-w-3xl mx-auto text-lg md:text-xl font-light">
          Connecting customers with trusted service providers and empowering professionals to grow their business efficiently.
        </p>
      </section>

      {/* OUR MISSION */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-gray-800 text-center mb-12">Our Mission</h2>
        <p className="text-gray-700 max-w-4xl mx-auto text-center text-lg md:text-lg font-light leading-relaxed">
          Our mission is to create a secure, reliable, and easy-to-use platform where customers can find skilled professionals
          for home and business services while providing service providers the tools they need to showcase their expertise, manage bookings, and grow their clientele.
        </p>
      </section>

      {/* OUR VISION */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-12">Our Vision</h2>
          <p className="text-gray-700 max-w-4xl mx-auto text-lg font-light leading-relaxed">
            We envision a world where finding trustworthy services is fast and hassle-free, and service providers are empowered to thrive
            without worrying about visibility, marketing, or client acquisition. Proxify bridges the gap between demand and expertise.
          </p>
        </div>
      </section>

      {/* VALUES */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-gray-800 text-center mb-12">Our Core Values</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <ValueCard
            title="Trust & Transparency"
            description="We ensure every service provider is verified and maintain clear communication channels between customers and providers."
          />
          <ValueCard
            title="Reliability"
            description="We prioritize consistent service quality, secure payments, and timely communication."
          />
          <ValueCard
            title="Empowerment"
            description="We give professionals the tools to manage their services, connect with clients, and grow their business."
          />
        </div>
      </section>

      {/* TEAM */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-12">Meet the Team</h2>
          <p className="text-gray-700 max-w-4xl mx-auto text-lg font-light mb-8">
            Our dedicated team is passionate about creating seamless connections between customers and service providers.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <TeamMember
              name="Alice Johnson"
              role="CEO & Founder"
              img="https://randomuser.me/api/portraits/women/44.jpg"
            />
            <TeamMember
              name="Bob Smith"
              role="CTO"
              img="https://randomuser.me/api/portraits/men/46.jpg"
            />
            <TeamMember
              name="Carol White"
              role="Head of Operations"
              img="https://randomuser.me/api/portraits/women/65.jpg"
            />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-300 py-6 text-center text-sm">
        © {new Date().getFullYear()} Proxify | Final Year Project
      </footer>
    </div>
  );
}

/* ================= REUSABLE COMPONENTS ================= */

function ValueCard({ title, description }) {
  return (
    <div className="bg-teal-50 p-6 rounded-lg shadow hover:shadow-lg transition transform hover:-translate-y-1 text-center">
      <h3 className="text-xl font-semibold mb-3 text-teal-600">{title}</h3>
      <p className="text-gray-700 font-light">{description}</p>
    </div>
  );
}

function TeamMember({ name, role, img }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition transform hover:-translate-y-1">
      <img src={img} alt={name} className="w-32 h-32 mx-auto rounded-full mb-4 object-cover" />
      <h3 className="text-xl font-semibold text-gray-800">{name}</h3>
      <p className="text-gray-600 font-light">{role}</p>
    </div>
  );
}
