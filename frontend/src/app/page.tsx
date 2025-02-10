'use client';

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(true);
  const [loading, setLoading] = useState(true);

  // Check login status from the backend
  useEffect(() => {
    fetch("http://localhost:8000/auth-status") // ✅ Backend now manages auth
      .then(res => res.json())
      .then(data => {
        if (data.logged_in) {
          setToken(data.token);
          setShowDialog(false);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div className="bg-white text-black min-h-screen flex flex-col items-center px-6">
      <Navbar />
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect to Spotify</DialogTitle>
          </DialogHeader>
          <p className="mb-6 text-gray-600">Log in with Spotify to explore your listening habits.</p>
          <Button
            className="bg-black text-white px-6 py-3 rounded-full font-medium hover:bg-gray-800 transition"
            onClick={() => {
                window.location.href = `${process.env.NEXT_PUBLIC_SPOTIFY_API_URL}/login`; // ✅ Uses env variable
              }}
              
          >
            Connect with Spotify
          </Button>
        </DialogContent>
      </Dialog>

      {!showDialog && token && (
        <div className="max-w-3xl w-full mt-16 text-center">
          <h1 className="text-5xl font-extrabold mb-4">Spotify Analytics</h1>
          <p className="text-lg text-gray-700 mb-8">
            Discover your most played songs and gain insights into your listening habits.
          </p>
          <div className="grid gap-6 text-left text-gray-800 max-w-2xl mx-auto">
            <div className="border-b pb-4">
              <h2 className="text-2xl font-bold">About Spotify Analytics</h2>
              <p className="mt-2 text-gray-600">
                Spotify Analytics is a web application that connects with your Spotify account to display your most played tracks. 
                It provides a sleek and intuitive way to explore your music data.
              </p>
            </div>
            <div className="border-b pb-4">
              <h2 className="text-2xl font-bold">How It Works</h2>
              <ul className="mt-2 list-disc list-inside text-gray-600">
                <li>Log in with your Spotify account.</li>
                <li>View your top 25 most played songs.</li>
                <li>Interact with track previews and explore your listening trends.</li>
              </ul>
            </div>
            <div className="border-b pb-4">
              <h2 className="text-2xl font-bold">Who Built This?</h2>
              <p className="mt-2 text-gray-600">
                Spotify Analytics was developed as a passion project to blend music with technology. 
                Built using Next.js, React, TailwindCSS, and the Spotify Web API.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
