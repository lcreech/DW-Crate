document.addEventListener("DOMContentLoaded", () => {
  // DOM elements
  const authSection = document.getElementById("auth-section");
  const playlistSection = document.getElementById("playlist-section");
  const tracksSection = document.getElementById("tracks-section");
  const authButton = document.getElementById("auth-button");
  const playlistsContainer = document.getElementById("playlists-container");
  const fetchDWPlaylistsButton = document.getElementById("fetch-dw-playlists");
  const createPlaylistButton = document.getElementById("create-playlist");
  const tracksList = document.getElementById("tracks-list");

  // Spotify API credentials
  const clientId = "cb3468700cfa49fda9bdd7af2319dcc5";
  const redirectUri = "https://dwcrate.netlify.app/";
  const scopes = "playlist-read-private playlist-modify-public playlist-modify-private user-library-read";

  // Get access token from URL hash after redirection
  function getAccessTokenFromUrl() {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get("access_token");
      if (token) {
        localStorage.setItem('access_token', token);  // Store token for future use
        return token;
      }
    }
    return localStorage.getItem('access_token');  // Try to get it from local storage
  }

  // Handle login process
  function login() {
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=token`;
    window.location = authUrl;
  }

  // Check for access token
  let accessToken = getAccessTokenFromUrl();

  // If no token found, show login button
  if (!accessToken) {
    authSection.style.display = "block";  // Show login button
    playlistSection.classList.add("hidden");  // Hide playlist section
    tracksSection.classList.add("hidden");  // Hide tracks section
  } else {
    // Token exists, proceed to display playlists
    authSection.classList.add("hidden");  // Hide login button
    playlistSection.classList.remove("hidden");  // Show playlist section
    tracksSection.classList.remove("hidden");  // Show tracks section
    fetchUserPlaylists();  // Fetch user playlists
  }

  // Login button event listener
  authButton.addEventListener("click", login);

  // Fetch user playlists
  function fetchUserPlaylists() {
    fetch("https://api.spotify.com/v1/me/playlists", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        const playlists = data.items;
        if (playlists.length > 0) {
          playlists.forEach((playlist) => {
            if (playlist.name.toLowerCase().includes("discover weekly")) {
              createPlaylistLink(playlist.name, playlist.id);
            }
          });
        } else {
          alert("No Discover Weekly playlists found.");
        }
      })
      .catch((error) => console.error("Error fetching playlists:", error));
  }

  // Create link for each Discover Weekly playlist
  function createPlaylistLink(name, id) {
    const playlistLink = document.createElement("a");
    playlistLink.href = "#";
    playlistLink.textContent = name;
    playlistLink.addEventListener("click", () => {
      fetchTracksForPlaylist(id);
    });
    playlistsContainer.appendChild(playlistLink);
  }

  // Fetch tracks for selected playlist
  function fetchTracksForPlaylist(playlistId) {
    fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        const tracks = data.items;
        if (tracks.length > 0) {
          const trackUris = [];
          tracks.forEach((trackItem) => {
            const trackUri = trackItem.track.uri;
            if (!trackUris.includes(trackUri)) {
              trackUris.push(trackUri);  // Prevent duplicates
            }
          });
          addTracksToAggregatedPlaylist(trackUris);  // Add tracks to aggregated playlist
        } else {
          console.log("No tracks found in playlist:", playlistId);
        }
      })
      .catch((error) => console.error("Error fetching tracks:", error));
  }

  // Add tracks to Aggregated Discover Weekly playlist
  function addTracksToAggregatedPlaylist(trackUris) {
    // First, check if the aggregated playlist exists
    fetch("https://api.spotify.com/v1/me/playlists", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        const aggregatedPlaylist = data.items.find(
          (playlist) => playlist.name === "DW Crate - Aggregated Playlist"  // Changed the name here
        );
        const aggregatedPlaylistId = aggregatedPlaylist ? aggregatedPlaylist.id : null;

        if (aggregatedPlaylistId) {
          // If the aggregated playlist exists, add tracks to it
          fetch(
            `https://api.spotify.com/v1/playlists/${aggregatedPlaylistId}/tracks`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                uris: trackUris,
              }),
            }
          )
            .then((response) => response.json())
            .then((data) => {
              console.log("Tracks added to aggregated playlist:", data);
              alert("Tracks added successfully to the aggregated playlist.");
            })
            .catch((error) =>
              console.error("Error adding tracks to aggregated playlist:", error)
            );
        } else {
          // If no aggregated playlist exists, create one
          createAggregatedPlaylist(trackUris);
        }
      })
      .catch((error) => console.error("Error checking aggregated playlist:", error));
  }

  // Create a new aggregated playlist
  function createAggregatedPlaylist(trackUris) {
    fetch("https://api.spotify.com/v1/users/me/playlists", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "DW Crate - Aggregated Playlist",  // Name updated here
        description: "Aggregated playlist of Discover Weekly tracks.",
        public: false,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        const playlistId = data.id;
        addTracksToAggregatedPlaylist(trackUris);  // Now add the tracks to the newly created playlist
      })
      .catch((error) => console.error("Error creating playlist:", error));
  }
});
