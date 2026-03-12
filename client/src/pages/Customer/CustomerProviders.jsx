// src/pages/customer/CustomerProviders.jsx
import { useState, useEffect } from "react";
import { FaStar, FaTimes } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext.jsx";

const API_URL = "http://localhost:5000/api";

export default function CustomerProviders(){

const { token } = useAuth();

const [providers,setProviders] = useState([]);
const [loading,setLoading] = useState(true);

const [searchTerm,setSearchTerm] = useState("");

const [selectedProvider,setSelectedProvider] = useState(null);
const [bookingProvider,setBookingProvider] = useState(null);

const [bookingForm,setBookingForm] = useState({
date:"",
time:"",
location:"",
notes:""
});

/* ---------------- FETCH PROVIDERS ---------------- */

useEffect(()=>{

if(!token) return;

const fetchProviders = async()=>{

try{

const res = await fetch(`${API_URL}/providers`,{
headers:{ Authorization:`Bearer ${token}` }
});

const data = await res.json();

setProviders(Array.isArray(data)?data:[]);

}catch(err){
console.error(err);
setProviders([]);
}

setLoading(false);

};

fetchProviders();

},[token]);

/* ---------------- SEARCH ---------------- */

const filteredProviders = providers.filter(p=>{

const name = p.basicInfo?.providerName || p.name || "";
const services = p.services?.map(s=>s.name).join(" ") || p.service || "";

return (
name.toLowerCase().includes(searchTerm.toLowerCase()) ||
services.toLowerCase().includes(searchTerm.toLowerCase())
);

});

/* ---------------- BOOKING ---------------- */

const submitBooking = async()=>{

if(!bookingForm.date || !bookingForm.time || !bookingForm.location){
alert("Please select date, time and location");
return;
}

try{

const scheduledAt = new Date(`${bookingForm.date}T${bookingForm.time}`);

const res = await fetch(`${API_URL}/bookings`,{

method:"POST",

headers:{
Authorization:`Bearer ${token}`,
"Content-Type":"application/json"
},

body:JSON.stringify({

providerId:bookingProvider._id,
serviceId:bookingProvider.services?.[0]?._id,
scheduledAt,
location:bookingForm.location,
notes:bookingForm.notes

})

});

const data = await res.json();

if(!res.ok) throw new Error(data.message);

alert("Booking successful!");

setBookingProvider(null);

setBookingForm({
date:"",
time:"",
location:"",
notes:""
});

}catch(err){
alert(err.message);
}

};

/* ---------------- LOADING ---------------- */

if(loading){
return(
<div className="flex justify-center items-center h-64 text-sky-500 font-medium">
Loading providers...
</div>
);
}

/* ---------------- PAGE ---------------- */

return(

<div className="space-y-8">

{/* HEADER */}

<div className="border rounded-lg p-6 bg-sky-100 border-sky-400">

<h1 className="text-2xl font-bold text-sky-600">
Available Providers
</h1>

<p className="text-sky-600 mt-1">
Browse and search for providers
</p>

</div>

{/* SEARCH */}

<input
type="text"
placeholder="Search providers or services..."
value={searchTerm}
onChange={e=>setSearchTerm(e.target.value)}
className="w-full border border-sky-400 rounded-md p-3 focus:outline-none"
/>

{/* PROVIDERS */}

{filteredProviders.length===0 ? (

<div className="bg-white border rounded-lg py-16 text-center text-gray-500">
No providers found
</div>

) : (

<div className="grid md:grid-cols-3 gap-6">

{filteredProviders.map(p=>(

<div
key={p._id}
className="bg-white border rounded-lg p-5 hover:shadow-md transition cursor-pointer"
onClick={()=>setSelectedProvider(p)}
>

<h3 className="font-semibold text-lg text-sky-600">
{p.basicInfo?.providerName || p.name}
</h3>

<p className="text-gray-500 mt-1">
{p.services?.map(s=>s.name).join(", ") || p.service || "General Service"}
</p>

<p className="flex items-center gap-2 mt-2 text-sky-500">
<FaStar/>
{p.rating?.toFixed(1) || "N/A"}
</p>

<button
className="mt-4 w-full px-4 py-2 rounded-md font-medium border border-sky-500 text-sky-500 hover:bg-sky-100"
onClick={(e)=>{
e.stopPropagation();
setBookingProvider(p);
}}
>
Book Now
</button>

</div>

))}

</div>

)}

{/* PROVIDER DETAILS MODAL */}

{selectedProvider && (

<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

<div className="bg-white p-6 rounded-xl w-[400px] relative">

<button
className="absolute right-3 top-3"
onClick={()=>setSelectedProvider(null)}
>
<FaTimes/>
</button>

<h2 className="text-xl font-bold text-sky-600 mb-2">
{selectedProvider.basicInfo?.providerName || selectedProvider.name}
</h2>

<p className="text-gray-600">
Services: {selectedProvider.services?.map(s=>s.name).join(", ")}
</p>

<p className="mt-2">
Experience: {selectedProvider.experience || 0} years
</p>

<button
className="mt-4 w-full bg-sky-500 text-white py-2 rounded-lg"
onClick={()=>{
setBookingProvider(selectedProvider);
setSelectedProvider(null);
}}
>
Book This Provider
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

<h2 className="text-xl font-bold text-sky-600 mb-4">
Book {bookingProvider.basicInfo?.providerName || bookingProvider.name}
</h2>

<input
type="date"
className="border p-2 rounded w-full mb-3"
onChange={e=>setBookingForm({...bookingForm,date:e.target.value})}
/>

<input
type="time"
className="border p-2 rounded w-full mb-3"
onChange={e=>setBookingForm({...bookingForm,time:e.target.value})}
/>

<input
type="text"
placeholder="Location"
className="border p-2 rounded w-full mb-3"
onChange={e=>setBookingForm({...bookingForm,location:e.target.value})}
/>

<textarea
placeholder="Notes"
className="border p-2 rounded w-full mb-3"
onChange={e=>setBookingForm({...bookingForm,notes:e.target.value})}
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