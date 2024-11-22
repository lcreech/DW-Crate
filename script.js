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

    const trackUris = [];
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
        trackUris.push(...tracksData.items.map(item => item.track.uri));
      } else {
        console.log(`No tracks found in playlist: ${playlist.name}`);
      }
    }

    // Debugging: Log all track URIs to verify the correct tracks
    console.log("All Track URIs:", trackUris);

    // If there are no track URIs, return early
    if (trackUris.length === 0) {
      playlistsContainer.innerHTML = "<p>No tracks found in Discover Weekly playlists.</p>";
      return;
    }

    // Add Tracks to the New Playlist
    const chunkSize = 100; // Spotify's limit for adding tracks in one request
    for (let i = 0; i < trackUris.length; i += chunkSize) {
      const trackChunk = trackUris.slice(i, i + chunkSize);
      await fetch(
        `https://api.spotify.com/v1/playlists/${newPlaylist.id}/tracks`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ uris: trackChunk })
        }
      );
    }

    playlistsContainer.innerHTML =
      "<p>Aggregated playlist created successfully!</p>";
  } catch (error) {
    playlistsContainer.innerHTML = "<p>Failed to create playlist.</p>";
    console.error("Error creating playlist:", error);
  }
});

// Initialize App
window.onload = () => {
  accessToken = getAccessTokenFromUrl();
  if (accessToken) {
    authSection.classList.add("hidden");
    playlistSection.classList.remove("hidden");
    window.location.hash = ""; // Clear token from URL
  }
};
