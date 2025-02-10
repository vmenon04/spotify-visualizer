"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { motion, AnimatePresence } from "framer-motion"; // Import Framer Motion for animations

export default function SavedTracks() {
  const [albumCovers, setAlbumCovers] = useState<
    { image: string; name: string; artist: string; album: string; release_date: string; duration: string; popularity: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrack, setSelectedTrack] = useState<
    { image: string; name: string; artist: string; album: string; release_date: string; duration: string; popularity: number } | null
  >(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_SPOTIFY_API_URL}/saved-tracks`) 
      .then((res) => res.json())
      .then((data) => {
        if (data.album_covers) {
          setAlbumCovers(data.album_covers);
        } else {
          console.error("Unexpected API response:", data);
        }
        setLoading(false);
      })
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  return (
    <div className="bg-white min-h-screen flex flex-col items-center px-6">
      <Navbar />
      <div className="max-w-6xl w-full mt-12 text-center">
        <h1 className="text-4xl font-bold text-black mb-6">Your Saved Tracks</h1>
        <p className="text-md text-gray-600 mb-8">Click on an album cover to see track details.</p>

        {loading ? (
          <p className="text-gray-600">Loading your collection...</p>
        ) : (
          <div
            className="grid gap-0.5 p-2"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(35px, 1fr))", // Even smaller images
              gridAutoRows: "35px", // Smaller rows
            }}
          >
            {albumCovers.map((cover, index) => (
              <div
                key={index}
                className="relative group w-full h-full overflow-hidden cursor-pointer"
                onClick={() => setSelectedTrack(cover)}
              >
                {/* Album Cover */}
                <img
                  src={cover.image}
                  alt={cover.name}
                  className="rounded-sm shadow-sm w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                />
              </div>
            ))}
          </div>
        )}

        {/* Animated Modal */}
        <AnimatePresence>
          {selectedTrack && (
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }} // Smooth fade-out
              onClick={() => setSelectedTrack(null)} // Close modal when clicking outside
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0, transition: { duration: 0.2 } }} // Shrink effect when closing
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="bg-white p-6 rounded-lg shadow-xl w-96 text-center relative"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
              >
                <button
                  className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
                  onClick={() => setSelectedTrack(null)}
                >
                  ✖
                </button>
                <img src={selectedTrack.image} alt={selectedTrack.name} className="w-32 h-32 rounded-md mb-4 mx-auto" />
                <p className="text-black font-bold text-lg">{selectedTrack.name}</p>
                <p className="text-gray-600 text-md">{selectedTrack.artist}</p>
                <p className="text-gray-500 text-sm mt-2"><strong>Album:</strong> {selectedTrack.album}</p>
                <p className="text-gray-500 text-sm"><strong>Release Date:</strong> {selectedTrack.release_date}</p>
                <p className="text-gray-500 text-sm"><strong>Duration:</strong> {selectedTrack.duration}</p>
                <p className="text-gray-500 text-sm"><strong>Popularity:</strong> {selectedTrack.popularity}/100</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
