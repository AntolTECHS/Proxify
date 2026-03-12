
// src/pages/Customer/CustomerDashboard.jsx
import { useState, useEffect, useMemo } from "react";
import {
  FaClipboardList,
  FaUsers,
  FaStar,
  FaClock,
  FaTimes,
  FaRegStar,
  FaStarHalfAlt,
  FaBell
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function CustomerDashboard(){

const { user, token } = useAuth();

const [bookings,setBookings] = useState([]);
const [providers,setProviders] = useState([]);

const [bookingFilter,setBookingFilter] = useState("all");

const [searchTerm,setSearchTerm] = useState("");
const [serviceFilter,setServiceFilter] = useState("");

const [selectedProvider,setSelectedProvider] = useState(null);
const [bookingProvider,setBookingProvider] = useState(null);

const [selectedService,setSelectedService] = useState("");

const [notification,setNotification] = useState(null);

const [quickBooking,setQuickBooking] = useState({
date:"",
time:"",
location:"",
notes:""
});

useEffect(()=>{

if(!user || !token) return;

const fetchData = async()=>{

try{

const bookingsRes = await fetch(`${API_URL}/bookings`,{
headers:{ Authorization:`Bearer ${token}` }
});

const bookingsData = bookingsRes.ok ? await bookingsRes.json() : { bookings:[] };

setBookings(Array.isArray(bookingsData.bookings)?bookingsData.bookings:[]);

const providersRes = await fetch(`${API_URL}/providers`);
const providersData = providersRes.ok ? await providersRes.json() : [];

setProviders(Array.isArray(providersData)?providersData:[]);

}catch(err){
console.error(err);
}

};

fetchData();

},[user,token]);

/* ---------------- UPCOMING BOOKINGS ---------------- */

const upcomingBookings = useMemo(()=>{

return bookings.filter(b =>
b.status !== "completed" &&
b.status !== "cancelled"
);

},[bookings]);

const filteredBookings = useMemo(()=>{

if(bookingFilter==="upcoming") return upcomingBookings;

return bookings;

},[bookingFilter,bookings,upcomingBookings]);

/* ---------------- SERVICES ---------------- */

const allServices = useMemo(()=>{

const names = providers.flatMap(p =>
p.services?.map(s=>s.name) || []
);

return [...new Set(names)];

},[providers]);

/* ---------------- FILTER PROVIDERS ---------------- */

const filteredProviders = useMemo(()=>{

return providers.filter(p=>{

const matchesSearch =
(p.basicInfo?.providerName || "")
.toLowerCase()
.includes(searchTerm.toLowerCase());

const matchesService =
!serviceFilter ||
p.services?.some(
s => s.name.toLowerCase() === serviceFilter.toLowerCase()
);

return matchesSearch && matchesService;

});

},[providers,searchTerm,serviceFilter]);

/* ---------------- BOOKING ---------------- */

const submitBooking = async()=>{

if(!quickBooking.date || !quickBooking.time || !quickBooking.location){
alert("Please fill booking details");
return;
}

if(!selectedService){
alert("Please select a service");
return;
}

try{

const scheduledAt = new Date(`${quickBooking.date}T${quickBooking.time}`);

const res = await fetch(`${API_URL}/bookings`,{

method:"POST",

headers:{
Authorization:`Bearer ${token}`,
"Content-Type":"application/json"
},

body:JSON.stringify({

providerId:bookingProvider._id,
serviceId:selectedService,
scheduledAt,
location:quickBooking.location,
notes:quickBooking.notes

})

});

const data = await res.json();

if(!res.ok) throw new Error(data.message);

setBookings(prev=>[data.booking,...prev]);

setNotification("Booking confirmed!");

setBookingProvider(null);

setQuickBooking({
date:"",
time:"",
location:"",
notes:""
});

setSelectedService("");

setTimeout(()=>setNotification(null),4000);

}catch(err){
alert(err.message);
}

};

/* ---------------- UI ---------------- */

return(

<div className="p-6 bg-gray-100 min-h-screen">

{/* HEADER */}

<div className="flex justify-between items-center mb-8">

<h1 className="text-3xl font-bold text-sky-500">
Welcome {user?.name}
</h1>

<FaBell className="text-xl text-gray-500"/>

</div>

{notification && (

<div className="bg-green-100 text-green-700 px-4 py-2 rounded mb-6">
{notification}
</div>

)}

{/* STATS */}

<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">

<div onClick={()=>setBookingFilter("all")}>
<Stat icon={<FaClipboardList/>} label="Bookings" value={bookings.length}/>
</div>

<Stat icon={<FaUsers/>} label="Providers" value={providers.length}/>

<Stat
icon={<FaStar/>}
label="Avg Rating"
value={
providers.length
? (providers.reduce((a,b)=>a+(b.rating||0),0)/providers.length).toFixed(1)
: "0"
}
/>

<div onClick={()=>setBookingFilter("upcoming")}>
<Stat icon={<FaClock/>} label="Upcoming" value={upcomingBookings.length}/>
</div>

</div>

{/* BOOKINGS */}

<Section title={bookingFilter==="upcoming"?"Upcoming Bookings":"Your Bookings"}>

{filteredBookings.length===0
? <Empty text="No bookings yet."/>
:
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

{filteredBookings.map(b=>(

<div key={b._id} className="bg-white rounded-xl shadow p-4">

<p className="font-semibold">
{b.serviceName}
</p>

<p className="text-sm text-gray-500">
{b.provider?.basicInfo?.providerName}
</p>

<p className="text-sm text-gray-400">
{new Date(b.scheduledAt).toLocaleString()}
</p>

<div className="mt-2">
<StatusBadge status={b.status}/>
</div>

</div>

))}

</div>
}

</Section>

{/* PROVIDERS */}

<Section title="Available Providers">

<div className="flex flex-wrap gap-4 mb-6">

<input
placeholder="Search provider"
className="border px-3 py-2 rounded-lg"
onChange={e=>setSearchTerm(e.target.value)}
/>

<select
className="border px-3 py-2 rounded-lg"
onChange={e=>setServiceFilter(e.target.value)}
>

<option value="">All Services</option>

{allServices.map(s=>(
<option key={s}>{s}</option>
))}

</select>

</div>

<div className="max-h-[500px] overflow-y-auto">

<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">

{filteredProviders.map(p=>(

<div
key={p._id}
onClick={()=>setSelectedProvider(p)}
className="bg-white rounded-xl shadow hover:shadow-lg cursor-pointer overflow-hidden"
>

<img
src={p.basicInfo?.photoURL || "https://dummyimage.com/300x200/ccc/000"}
className="h-40 w-full object-cover"
/>

<div className="p-4">

<h3 className="font-bold text-lg text-sky-600">
{p.basicInfo?.providerName}
</h3>

<p className="text-sm text-gray-500">
{p.services?.map(s=>s.name).join(", ")}
</p>

<div className="flex items-center gap-2">
<StarRating rating={p.rating}/>
<span className="text-sm">{(p.rating||0).toFixed(1)}</span>
</div>

<p className="text-sm mt-1">
{p.experience} years experience
</p>

<p className="text-sky-600 font-semibold">
From ${p.services?.[0]?.price || 20}
</p>

</div>

</div>

))}

</div>

</div>

</Section>

{/* PROVIDER MODAL */}

{selectedProvider && (

<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

<div className="bg-white rounded-xl p-6 w-[400px] relative">

<button
className="absolute top-3 right-3"
onClick={()=>setSelectedProvider(null)}
>
<FaTimes/>
</button>

<h2 className="text-xl font-bold text-sky-500 mb-2">
{selectedProvider.basicInfo?.providerName}
</h2>

<StarRating rating={selectedProvider.rating}/>

<p className="mt-2">
Services: {selectedProvider.services?.map(s=>s.name).join(", ")}
</p>

<button
onClick={()=>{
setBookingProvider(selectedProvider);
setSelectedProvider(null);
setSelectedService("");
}}
className="bg-sky-500 text-white w-full py-2 rounded-lg mt-4"
>
Book Now
</button>

</div>

</div>

)}

{/* BOOKING MODAL */}

{bookingProvider && (

<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

<div className="bg-white p-6 rounded-xl w-[400px] relative">

<button
className="absolute right-3 top-3"
onClick={()=>setBookingProvider(null)}
>
<FaTimes/>
</button>

<h2 className="text-xl font-bold text-sky-500 mb-4">
Book {bookingProvider.basicInfo?.providerName}
</h2>

<select
className="border p-2 rounded w-full mb-3"
value={selectedService}
onChange={e=>setSelectedService(e.target.value)}
>
<option value="">Select Service</option>

{bookingProvider.services?.map(service=>(
<option key={service._id} value={service._id}>
{service.name} - ${service.price}
</option>
))}

</select>

<input
type="date"
className="border p-2 rounded w-full mb-3"
onChange={e=>setQuickBooking({...quickBooking,date:e.target.value})}
/>

<input
type="time"
className="border p-2 rounded w-full mb-3"
onChange={e=>setQuickBooking({...quickBooking,time:e.target.value})}
/>

<input
type="text"
placeholder="Location"
className="border p-2 rounded w-full mb-3"
onChange={e=>setQuickBooking({...quickBooking,location:e.target.value})}
/>

<textarea
placeholder="Notes"
className="border p-2 rounded w-full mb-3"
onChange={e=>setQuickBooking({...quickBooking,notes:e.target.value})}
/>

<button
onClick={submitBooking}
className="bg-sky-500 text-white w-full py-2 rounded-lg"
>
Confirm Booking
</button>

</div>

</div>

)}

</div>

);

}

/* COMPONENTS */

const Stat = ({icon,label,value})=>(

<div className="bg-white p-5 rounded-xl shadow flex items-center gap-4 cursor-pointer">
<div className="text-sky-500 text-xl">{icon}</div>
<div>
<p className="text-gray-500 text-sm">{label}</p>
<p className="text-2xl font-bold">{value}</p>
</div>
</div>

);

const Section = ({title,children})=>(

<div className="bg-white p-6 rounded-xl shadow mb-8">
<h2 className="text-xl font-semibold mb-4 text-sky-500">{title}</h2>
{children}
</div>

);

const Empty = ({text})=>(
<p className="text-center text-gray-500 py-6">{text}</p>
);

const StatusBadge = ({status})=>{

const styles={
pending:"bg-yellow-100 text-yellow-700",
accepted:"bg-blue-100 text-blue-700",
completed:"bg-green-100 text-green-700",
cancelled:"bg-red-100 text-red-700"
};

return(
<span className={`px-3 py-1 rounded-full text-sm ${styles[status]}`}>
{status}
</span>
);

};

const StarRating = ({rating=0})=>{

const stars=[];

for(let i=1;i<=5;i++){

if(rating>=i) stars.push(<FaStar key={i} className="text-yellow-400"/>);
else if(rating>=i-0.5) stars.push(<FaStarHalfAlt key={i} className="text-yellow-400"/>);
else stars.push(<FaRegStar key={i} className="text-gray-300"/>);

}

return <div className="flex gap-1">{stars}</div>;

};
