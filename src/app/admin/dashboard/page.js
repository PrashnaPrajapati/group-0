"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import AdminSidebar from "@/components/AdminSidebar";
import "react-toastify/dist/ReactToastify.css";

import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(null);  
  const [loading, setLoading] = useState(true); 
  const [activeTab, setActiveTab] = useState("services");
 
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [sentimentData, setSentimentData] = useState([]);

  const ensureAuth = (status) => {
    if (status === 401 || status === 403) {
      toast.error("Session expired or unauthorized. Please login again.");
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      router.replace("/login");
      return false;
    }
    return true;
  };

  const safeFetch = async (url, token) => {
    try {
      const res = await fetch(url, { headers: { Authorization: token ? `Bearer ${token}` : "" } });

      if (res.status === 401 || res.status === 403) {
        ensureAuth(res.status);
        return [];
      }

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        console.error("safeFetch bad response", url, res.status, json);
        return [];
      }

      if (Array.isArray(json)) return json;
      if (json && Array.isArray(json.data)) return json.data;
      if (json && typeof json === "object" && Object.keys(json).length === 0) return [];

      return [];
    } catch (err) {
      console.error("Fetch error:", err);
      return [];
    }
  };

  const [servicesList, setServicesList] = useState([]);
  const [packagesList, setPackagesList] = useState([]);
  const [bookingsList, setBookingsList] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);

  const COLORS = ["#ec4899", "#a855f7", "#6366f1", "#14b8a6", "#facc15"];


  const renderPieLabel = (entry, index, data) => {
    const total = data.reduce((sum, item) => sum + (item.value || item.count), 0);
    const percent = total ? ((entry.value || entry.count) / total * 100).toFixed(1) : 0;
    return `${entry.name || entry.sentiment}: ${percent}%`;
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role"); 
    if (!token) return router.replace("/login"); 
    if (role !== "admin") return router.replace("/dashboard");
 
    const fetchDashboard = async () => {
      try {
        const res = await fetch("http://localhost:5001/admin/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load stats");
      } finally {
        setLoading(false);
      }
    };

    const fetchCharts = async () => {
      const [monthly, category, sentiment] = await Promise.all([
        safeFetch("http://localhost:5001/admin/monthly-stats", token),
        safeFetch("http://localhost:5001/admin/service-categories", token),
        safeFetch("http://localhost:5001/admin/ai-sentiment", token),
      ]);

      console.log("admin monthly stats", monthly);
      console.log("admin category stats", category);
      console.log("admin sentiment stats", sentiment);

      const coloredCategory = category.map((item, i) => ({ ...item, fill: COLORS[i % COLORS.length] }));
      const coloredSentiment = sentiment.map((item, i) => ({ ...item, fill: COLORS[i % COLORS.length] }));

      setMonthlyData(monthly);
      setCategoryData(coloredCategory);
      setSentimentData(coloredSentiment);
    };

    const fetchTabData = async () => {
      const [services, packages, bookings, feedback] = await Promise.all([
        safeFetch("http://localhost:5001/services", token),
        safeFetch("http://localhost:5001/packages", token),
        safeFetch("http://localhost:5001/bookings/my", token),
        safeFetch("http://localhost:5001/feedback", token),
        
      ]);

      // Top 5 for dashboard
      setServicesList(services
        .sort((a,b) => (b.rating || 0) - (a.rating || 0))
        .slice(0,5)
      );

      setPackagesList(packages
        .map(pkg => ({ ...pkg, services: pkg.services?.map(s => s.name) || [] }))
        .sort((a,b) => (b.rating || 0) - (a.rating || 0))
        .slice(0,5)
      );

      setBookingsList(bookings.slice(0,5));
      setFeedbackList(feedback);
    };

    fetchDashboard();
    fetchCharts();
    fetchTabData();
  }, [router]);

  if (loading) return <div className="p-10 text-center text-gray-500">Loading dashboard...</div>;

  return (
    <AdminSidebar>
      <ToastContainer position="top-center" />
      <div className="space-y-8">
  <h1 className="text-4xl font-bold flex items-center gap-3">
  <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
    Admin Dashboard
  </span>
</h1>

  {/* Stack vertically */}
  <div className="flex flex-col gap-1 text-gray-600">
    <p className="text-2xl font-medium">Welcome back, Admin!</p>
    <p className="text-md">Manage your services, bookings, and analytics</p>
  </div>


        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card title="Total Services" value={stats?.totalServices} />
          <Card title="Total Packages" value={stats?.totalPackages} />
          <Card title="Total Bookings" value={stats?.totalBookings} />
          <Card title="Total Users" value={stats?.totalUsers} />
        </div>

        {/* Dashboard Charts */}
        <div className="grid md:grid-cols-2 gap-8 mt-6">

          <ChartCard title="Monthly Bookings">
            {monthlyData.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No monthly bookings data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="bookings" stroke="#ec4899" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Revenue">
            {monthlyData.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No revenue data available yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#a855f7" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          

          <ChartCard title="Service Category Distribution">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  label={(entry,index)=>renderPieLabel(entry,index,categoryData)}
                />
                <Tooltip formatter={value => [value,"Services"]} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="AI Sentiment Analysis">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sentimentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="sentiment" />
                <YAxis />
                <Tooltip formatter={value => [value, "Feedbacks"]} />
                <Bar dataKey="count" fill="#ec4899" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

        </div>

        {/* Tabs */}
        <div className="bg-gray-100 rounded-full p-2 flex md:w-3/4 mx-auto mt-8 text-gray-600">
          {["services","packages","bookings","feedback"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-full ${activeTab===tab?"bg-white shadow":"hover:bg-gray-200"}`}
            >
              {tab.charAt(0).toUpperCase()+tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {/* Tab Content */}
<div className="text-pink-400">
  {activeTab === "services" && (
    <TabContent title="Top 5 Services" items={servicesList} type="services" />
  )}
  {activeTab === "packages" && (
    <TabContent title="Top 5 Packages" items={packagesList} type="packages" />
  )}
  {activeTab === "bookings" && (
    <TabContent title="Top 5 Bookings" items={bookingsList} type="bookings" />
  )}
  {activeTab === "feedback" && (
    <TabContent title="All Feedbacks" items={feedbackList} type="feedback" />
  )}
</div>

      </div>
    </AdminSidebar>
  );
}

// Stats card
function Card({ title, value }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-[0_4px_6px_-1px_rgba(236,72,153,0.4),0_2px_4px_-1px_rgba(236,72,153,0.06)] text-center">
      <p className="text-gray-500">{title}</p>
      <p className="text-3xl font-bold text-pink-500">{value||0}</p>
    </div>
  );
}

// Chart wrapper
function ChartCard({ title, children }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <h3 className="font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}

// Tab content component
function TabContent({ title, items, type }) {
  if (!items || items.length === 0) {
    return <div className="bg-white p-10 rounded-xl shadow text-center text-gray-500 mt-6">No data found.</div>;
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-[0_4px_6px_-1px_rgba(236,72,153,0.4),0_2px_4px_-1px_rgba(236,72,153,0.06)] mt-6">
      <h3 className="text-xl font-semibold mb-4">{title}</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600 border-separate border-spacing-0">
          <thead className="bg-pink-50 text-gray-700">
            <tr>
              {type === "services" && <>
                <th className="p-3">Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Price</th>
                <th className="p-3">Duration</th>
                <th className="p-3">Ratings</th>
              </>}
              {type === "packages" && <>
                <th className="p-3">Name</th>
                <th className="p-3">Price</th>
                <th className="p-3">Services Included</th>
                <th className="p-3">Ratings</th>
              </>}
              {type === "bookings" && <>
                <th className="p-3">Service/Package</th>
                <th className="p-3">Status</th>
                <th className="p-3">Amount</th>
              </>}
              {type === "feedback" && <>
                <th className="p-3">Customer</th>
                <th className="p-3">Feedback</th>
                <th className="p-3">Rating</th>
              </>}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="border-t">
                {type === "services" && <>
                  <td className="p-3 font-medium text-gray-700">{item.name}</td>
                  <td className="p-3 text-gray-600">{item.category}</td>
                  <td className="p-3 text-gray-600 ">Rs. {item.price}</td>
                  <td className="p-3 text-gray-600">{item.duration}</td>
                  <td className="p-3 text-gray-600">{item.rating || "-"}</td>
                </>}
                {type === "packages" && <>
                  <td className="p-3 font-medium text-gray-700">{item.name}</td>
                  <td className="p-3 text-gray-600 ">Rs. {item.price}</td>
                  <td className="p-3 text-gray-600">{item.services?.join(", ")}</td>
                  <td className="p-3 text-gray-600">{item.rating || "-"}</td>
                </>}
                {type === "bookings" && <>
                  <td className="p-3 text-gray-600">{item.services || item.packages}</td>
                  <td className="p-3 text-gray-600">
                    <select
                      value={item.status}
                      onChange={(e) => {
                        const newStatus = e.target.value;
                        // Optimistic update
                        const updatedBookings = [...items];
                        updatedBookings[index] = {...item, status: newStatus};
                        items = updatedBookings; // update local variable for rendering
                        // Update backend
                        fetch(`http://localhost:5001/admin/bookings/${item.id}/status`, {
                          method: "PUT",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${localStorage.getItem("token")}`,
                          },
                          body: JSON.stringify({ status: newStatus }),
                        }).catch(err => console.error("Failed to update status:", err));
                      }}
                      className={`border rounded px-2 py-1 ${
                        item.status === "upcoming" ? "text-blue-600 border-blue-200" :
                        item.status === "completed" ? "text-green-600 border-green-200" :
                        "text-red-600 border-red-200"
                      }`}
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="completed">Completed</option>
                    </select>
                  </td>
                  <td className="p-3 text-gray-600 font-semibold">{item.service_price || item.package_price || 0}</td>
                </>}
                {type === "feedback" && <>
                  <td className="p-3 font-medium">{item.customer}</td>
                  <td className="p-3">{item.feedback}</td>
                  <td className="p-3">{item.rating || "-"}</td>
                </>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}