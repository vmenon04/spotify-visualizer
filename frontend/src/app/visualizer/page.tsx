"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function Visualizer() {
  const [tracks, setTracks] = useState<{ name: string; artist: string; image: string; x: number; y: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_SPOTIFY_API_URL}/taste-visualizer`) 
      .then((res) => res.json())
      .then((data) => {
        if (data.tracks) {
          setTracks(data.tracks);
        } else {
          console.error("Unexpected API response:", data);
        }
        setLoading(false);
      })
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: any }[] }) => {
    if (active && payload && payload.length) {
      const track = payload[0].payload;
      return (
        <div className="bg-white p-3 shadow-lg rounded-md">
          <img src={track.image} alt={track.name} className="w-20 h-20 rounded-md mb-2" />
          <p className="text-black font-bold">{track.name}</p>
          <p className="text-gray-600">{track.artist}</p>
          <p className="text-gray-500">Duration: {track.y} sec</p>
          <p className="text-gray-500">Popularity: {track.x}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white text-black min-h-screen flex flex-col items-center px-6">
      <Navbar />
      <div className="max-w-4xl w-full mt-12 text-center">
        <h1 className="text-4xl font-bold mb-6">Your Music Taste Visualizer</h1>
        <p className="text-md text-gray-700 mb-8">Explore your saved tracks by popularity and duration.</p>
        
        {loading ? (
          <p>Loading visualizer...</p>
        ) : (
          <ResponsiveContainer width="100%" height={500}>
            <ScatterChart margin={{ top: 20, right: 30, left: 80, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" />

              {/* X-Axis: Popularity */}
              <XAxis 
                type="number" 
                dataKey="x" 
                name="Popularity" 
                label={{ value: "Popularity (0-100)", position: "insideBottom", dy: 35 }} 
                domain={[0, 100]} 
              />

              {/* Y-Axis: Duration in Seconds */}
              <YAxis 
                type="number" 
                dataKey="y" 
                name="Duration (seconds)"
                label={{ value: "Duration (seconds)", angle: -90, position: "insideLeft", dx: -40 }} 
              />

              <Tooltip content={<CustomTooltip />} />
              <Scatter data={tracks} fill="black" />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
