"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { motion } from "framer-motion";

export default function Top25() {
  const [topTracks, setTopTracks] = useState<{ 
    name: string; artist: string; album: string; image: string; preview_url: string; id: string 
  }[]>([]);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/top-tracks", {credentials: "include"}) 
      .then((res) => res.json())
      .then((data) => {
        console.log("API Response:", data); // ✅ Debug Log
  
        if (data.tracks && Array.isArray(data.tracks) && data.tracks.length > 0) {
          setTopTracks(data.tracks);
        } else {
          console.error("Unexpected API response:", data);
        }
        setLoading(false);
      })
      .catch((error) => console.error("Error fetching Spotify data:", error));
  }, []);
  

  const playPreview = (previewUrl: string | null) => {
    if (!previewUrl) return;
    if (playingTrack === previewUrl) {
      if (audio) {
        audio.pause();
        setPlayingTrack(null);
      }
    } else {
      if (audio) {
        audio.pause();
      }
      const newAudio = new Audio(previewUrl);
      newAudio.play();
      setAudio(newAudio);
      setPlayingTrack(previewUrl);
      newAudio.onended = () => setPlayingTrack(null);
    }
  };

  return (
    <div className="bg-white text-black min-h-screen flex flex-col items-center px-6">
      <Navbar />
      <div className="max-w-2xl w-full mt-12 text-center">
        <h1 className="text-4xl font-bold mb-6">Your Top 25 Tracks</h1>
        <p className="text-md text-gray-700 mb-8">A curated view of the songs you&apos;ve been playing the most.</p>
        
        {loading ? (
          <p>Loading tracks...</p>
        ) : (
          <div className="flex flex-col gap-6 w-full max-w-2xl">
            {topTracks.length > 0 ? (
              topTracks.map((track, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Card className="p-6 flex items-center bg-gray-100 rounded-lg shadow-md space-x-6">
                    <img src={track.image} alt={track.name} className="w-24 h-24 rounded-lg" />
                    <div className="flex flex-col flex-1">
                      <span className="text-lg font-semibold">{track.name}</span>
                      <span className="text-sm text-gray-600">{track.artist}</span>
                      <span className="text-sm text-gray-500">{track.album}</span>
                    </div>
                    {track.preview_url ? (
                      <Button 
                        className="bg-black text-white px-4 py-2 rounded-full hover:bg-gray-800 transition"
                        onClick={() => playPreview(track.preview_url)}
                      >
                        {playingTrack === track.preview_url ? "Pause" : "Play"}
                      </Button>
                    ) : (
                      <a 
                        href={`https://open.spotify.com/track/${track.id}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs text-blue-500 hover:underline"
                      >
                        Listen on Spotify
                      </a>
                    )}
                  </Card>
                </motion.div>
              ))
            ) : (
              <p>No top tracks available.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
