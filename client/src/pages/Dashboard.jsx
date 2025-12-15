import Profile from "../components/Provider/Profile.jsx";
import Services from "../components/Provider/Services.jsx";
import Bookings from "../components/Customer/Bookings.jsx";
import ChatBox from "../components/Chat/ChatBox.jsx";

export default function Dashboard() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <div className="grid md:grid-cols-2 gap-4">
        <Profile />
        <Services />
      </div>
      <Bookings />
      <ChatBox roomId="global-room" />
    </div>
  );
}
