const clientId = "cb3468700cfa49fda9bdd7af2319dcc5";
const redirectUri = "https://dwcrate.netlify.app/";
const scopes = [
  "playlist-read-private",
  "playlist-modify-private",
  "playlist-modify-public"
];

const authEndpoint = "https://accounts.spotify.com/authorize";
let accessToken = null;

// DOM Elements
const authButton = document.getElementById("auth-button");
const fetchPlaylistsButton = document.getElementById("fetch-dw-playlists");
const createPlaylistButton = document.getElementById("create-playlist");
const playlistsContainer = document.getElementById("playlists-container");
const authSection = document.getElementById("auth-section");
const playlistSection = document.getElementById("playlist-section");

// Build Authorization URL
function buildAuthUrl() {
  return (
    `${authEndpoint}?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scopes.join(" "))}` +
    `&response_type=token`
  );
}

// Extract Access Token from URL Hash
function getAccessTokenFromUrl() {
  const hash = window.location.hash;
  if (hash) {
    const params = new URLSearchParams(hash.substring(1));
    return params.get("access_token");
  }
  return null;
}

// Authenticate User
authButton.addEventListener("click", () => {
  window.location.href = buildAuthUrl();
});

// Fetch All Playlists from Spotify
fetchPlaylistsButton.addEventListener("click", async () => {
  playlistsContainer.innerHTML = "<p>Loading playlists...</p>";

  let allPlaylists = [];
  let nextUrl = "https://api.spotify.com/v1/me/playlists?limit=50";

  try {
    // Pagination loop to fetch all playlists
    while (nextUrl) {
      const response = await fetch(nextUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      allPlaylists = allPlaylists.concat(data.items);
      nextUrl = data.next; // Update URL for next page if exists
    }

    // Filter Discover Weekly Playlists
    const discoverWeeklyPlaylists = allPlaylists.filter(playlist =>
      playlist.name.toLowerCase().includes("discover weekly")
    );

    playlistsContainer.innerHTML = ""; // Clear loading message

    if (discoverWeeklyPlaylists.length === 0) {
      playlistsContainer.innerHTML = "<p>No Discover Weekly playlists found.</p>";
      return;
    }

    // Display Playlists in UI
    discoverWeeklyPlaylists.forEach(playlist => {
      const div = document.createElement("div");
      div.textContent = `${playlist.name} (${playlist.tracks.total} tracks)`;
      playlistsContainer.appendChild(div);
    });

    createPlaylistButton.classList.remove("hidden");
  } catch (error) {
    playlistsContainer.innerHTML = "<p>Failed to load playlists.</p>";
    console.error("Error fetching playlists:", error);
  }
});

// Create Aggregated Playlist
createPlaylistButton.addEventListener("click", async () => {
  playlistsContainer.innerHTML = "<p>Creating aggregated playlist...</p>";

  try {
    // Fetch User's Profile to Get User ID
    const userProfileResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    const userProfile = await userProfileResponse.json();

    // Create New Playlist
    const createPlaylistResponse = await fetch(
      `https://api.spotify.com/v1/users/${userProfile.id}/playlists`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: "DW Crate - Aggregated Discover Weekly",
          description: "All your Discover Weekly tracks in one playlist!",
          public: true
        })
      }
    );

    const newPlaylist = await createPlaylistResponse.json();

    // Fetch Tracks from All Discover Weekly Playlists
    const playlistsResponse = await fetch("https://api.spotify.com/v1/me/playlists", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const playlistsData = await playlistsResponse.json();
    const discoverWeeklyPlaylists = playlistsData.items.filter(playlist =>
      playlist.name.toLowerCase().includes("discover weekly")
    );

    const trackUris = new Set(); // Use Set to avoid duplicates
    const aggregatedPlaylistTracks = await fetchTracksFromPlaylist(newPlaylist.id); // Get existing tracks in the aggregated playlist

    // Collect tracks from each Discover Weekly playlist
    for (const playlist of discoverWeeklyPlaylists) {
      console.log(`Fetching tracks for playlist: ${playlist.name} with ID: ${playlist.id}`);

      // Fetch tracks from each Discover Weekly playlist
      const tracksResponse = await fetch(
        `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=100`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      const tracksData = await tracksResponse.json();

      // Debugging: Log all track data to check the response
      console.log(`Tracks from ${playlist.name}:`, tracksData);

      // Ensure there are tracks, then add them
      if (tracksData.items && tracksData.items.length > 0) {
        tracksData.items.forEach(item => {
          // Skip tracks already in the aggregated playlist
          if (aggregatedPlaylistTracks.includes(item.track.uri)) {
            return;
          }

          // Skip tracks from Discover Weekly playlist (prevention of adding Discover Weekly tracks)
          if (playlist.name.toLowerCase().includes("discover weekly")) {
            return;
          }

          trackUris.add(item.track.uri);
        });
      }
    }

    // Add unique tracks to the aggregated playlist
    if (trackUris.size > 0) {
      const trackUrisArray = Array.from(trackUris);

      await fetch(`https://api.spotify.com/v1/playlists/${newPlaylist.id}/tracks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          uris: trackUrisArray
        })
      });

      playlistsContainer.innerHTML = `<p>Successfully created the aggregated playlist with ${trackUrisArray.length} tracks!</p>`;
    } else {
      playlistsContainer.innerHTML = "<p>No new tracks to add to the aggregated playlist.</p>";
    }
  } catch (error) {
    playlistsContainer.innerHTML = "<p>Failed to create the aggregated playlist.</p>";
    console.error("Error creating playlist:", error);
  }
});

// Fetch existing tracks from a playlist (used to prevent adding duplicates)
async function fetchTracksFromPlaylist(playlistId) {
  const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const data = await response.json();
  return data.items.map(item => item.track.uri); // Return a list of track URIs
}
