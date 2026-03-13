
// src/pages/provider/ProviderJobs.jsx
import { useState, useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function ProviderJobs() {

const { token } = useAuth();

const [jobs,setJobs] = useState([]);
const [modalJob,setModalJob] = useState(null);
const [loading,setLoading] = useState(true);

/* ---------------- FETCH JOBS ---------------- */

useEffect(()=>{

fetchJobs();

},[]);

const fetchJobs = async()=>{

try{

const res = await fetch(`${API}/bookings/provider`,{
headers:{
Authorization:`Bearer ${token}`
}
});

const data = await res.json();

if(res.ok){
setJobs(data.bookings || []);
}

}catch(err){
console.error(err);
}

setLoading(false);

};

/* ---------------- UPDATE STATUS ---------------- */

const updateStatus = async(id,status)=>{

try{

const res = await fetch(`${API}/bookings/${id}/status`,{

method:"PATCH",

headers:{
Authorization:`Bearer ${token}`,
"Content-Type":"application/json"
},

body:JSON.stringify({status})

});

const data = await res.json();

if(res.ok){

setJobs(prev =>
prev.map(j =>
j._id === id ? data.booking : j
)
);

if(modalJob?._id === id){
setModalJob(data.booking);
}

}

}catch(err){
console.error(err);
}

};

/* ---------------- STATUS COLOR ---------------- */

const statusColor = (status)=>{

if(status === "pending") return "text-yellow-600";
if(status === "accepted") return "text-blue-600";
if(status === "in_progress") return "text-purple-600";
if(status === "completed") return "text-green-600";
if(status === "cancelled") return "text-red-600";

return "text-gray-600";

};

/* ---------------- UI ---------------- */

return(

<div className="w-full min-h-screen bg-gray-100 p-4 md:p-6">

<h1 className="text-3xl font-bold text-gray-800 mb-6">
Your Jobs
</h1>

{loading ? (

<p className="text-gray-500">Loading jobs...</p>

) : jobs.length === 0 ? (

<p className="text-gray-500">No jobs yet.</p>

) : (

<div className="overflow-x-auto bg-white rounded-lg shadow-md border">

<table className="min-w-full">

<thead className="bg-gray-50">

<tr>

<th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
Service
</th>

<th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
Customer
</th>

<th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
Date
</th>

<th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
Status
</th>

<th className="px-4 py-2"></th>

</tr>

</thead>

<tbody className="divide-y">

{jobs.map(job=>(

<tr key={job._id} className="hover:bg-gray-50">

<td className="px-4 py-2">
{job.serviceName}
</td>

<td className="px-4 py-2">
{job.customer?.name}
</td>

<td className="px-4 py-2">
{new Date(job.scheduledAt).toLocaleDateString()}
</td>

<td className={`px-4 py-2 font-semibold ${statusColor(job.status)}`}>
{job.status}
</td>

<td className="px-4 py-2">

<button
onClick={()=>setModalJob(job)}
className="px-3 py-1 bg-sky-500 text-white rounded hover:bg-sky-600 text-sm"
>

View

</button>

</td>

</tr>

))}

</tbody>

</table>

</div>

)}

{/* ---------------- JOB MODAL ---------------- */}

{modalJob && (

<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">

<div className="bg-white w-full max-w-lg rounded-lg shadow-lg relative">

<button
onClick={()=>setModalJob(null)}
className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
>

<FaTimes/>

</button>

<div className="p-6">

<h2 className="text-xl font-semibold mb-4">
{modalJob.serviceName}
</h2>

<p>
<strong>Customer:</strong> {modalJob.customer?.name}
</p>

<p>
<strong>Date:</strong>{" "}
{new Date(modalJob.scheduledAt).toLocaleString()}
</p>

<p>
<strong>Location:</strong> {modalJob.location}
</p>

<p>
<strong>Price:</strong> ${modalJob.price}
</p>

<p>
<strong>Status:</strong>{" "}
<span className={`font-semibold ${statusColor(modalJob.status)}`}>
{modalJob.status}
</span>
</p>

{modalJob.notes && (
<p className="mt-2 text-gray-600">
<strong>Notes:</strong> {modalJob.notes}
</p>
)}

{/* ACTION BUTTONS */}

<div className="flex gap-3 mt-6 flex-wrap">

{modalJob.status === "pending" && (

<button
onClick={()=>updateStatus(modalJob._id,"accepted")}
className="px-4 py-2 bg-blue-500 text-white rounded"
>

Accept Job

</button>

)}

{modalJob.status === "accepted" && (

<button
onClick={()=>updateStatus(modalJob._id,"in_progress")}
className="px-4 py-2 bg-purple-500 text-white rounded"
>

Start Job

</button>

)}

{modalJob.status === "in_progress" && (

<button
onClick={()=>updateStatus(modalJob._id,"completed")}
className="px-4 py-2 bg-green-500 text-white rounded"
>

Mark Completed

</button>

)}

<button
onClick={()=>updateStatus(modalJob._id,"cancelled")}
className="px-4 py-2 bg-red-500 text-white rounded"
>

Cancel

</button>

</div>

</div>

</div>

</div>

)}

</div>

);

}

